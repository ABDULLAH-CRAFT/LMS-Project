import { divRoundHalfUp } from '../finance/money.util';

// Pure, deterministic, integer-only maths (BigInt). No floats, no database, no clock.
// Scores carry 4 implied decimals (SCORE_SCALE); pool shares are parts-per-million (SHARE_SCALE).
export const SCORE_SCALE = 10000n; // 82.4 is stored as 824000
export const SHARE_SCALE = 1_000_000n; // 50% is stored as 500000

export interface WeightsBps {
  lessonCompletionBps: number;
  courseCompletionBps: number;
  assessmentBps: number;
  returningLearnerBps: number;
  ratingBps: number;
}

export interface RawTeacherMetrics {
  teacherId: string;
  lessonCompletions: number;
  courseCompletions: number;
  assessmentEvents: number;
  returningLearners: number;
  ratingSum: number;
  activeLearners: number;
}

export interface TeacherScore extends RawTeacherMetrics {
  lessonScore: bigint; // 0..100 x SCORE_SCALE
  courseCompletionScore: bigint;
  assessmentScore: bigint;
  returningLearnerScore: bigint;
  ratingScore: bigint;
  finalScore: bigint; // weighted, 0..100 x SCORE_SCALE
  poolSharePpm: bigint; // parts per million of the teacher pool; sums to exactly SHARE_SCALE (or 0 if nobody scored)
}

export function assertValidWeights(w: WeightsBps): void {
  const all = [w.lessonCompletionBps, w.courseCompletionBps, w.assessmentBps, w.returningLearnerBps, w.ratingBps];
  if (all.some((v) => !Number.isInteger(v) || v < 0 || v > 10000)) {
    throw new Error('Each engagement weight must be a whole number of basis points between 0 and 10000');
  }
  if (all.reduce((a, b) => a + b, 0) !== 10000) {
    throw new Error('Engagement weights must add up to exactly 100%');
  }
}

/** category score = metric / best teacher's metric x 100 (the top teacher in a category scores 100). */
function normalise(value: number, max: number): bigint {
  if (max <= 0 || value <= 0) return 0n;
  return divRoundHalfUp(BigInt(value) * 100n * SCORE_SCALE, BigInt(max));
}

export function calculateTeacherScores(metrics: RawTeacherMetrics[], weights: WeightsBps): TeacherScore[] {
  assertValidWeights(weights);

  const maxOf = (pick: (m: RawTeacherMetrics) => number) => metrics.reduce((acc, m) => Math.max(acc, pick(m)), 0);
  const maxLesson = maxOf((m) => m.lessonCompletions);
  const maxCourse = maxOf((m) => m.courseCompletions);
  const maxAssessment = maxOf((m) => m.assessmentEvents);
  const maxReturning = maxOf((m) => m.returningLearners);
  const maxRating = maxOf((m) => m.ratingSum);

  const scored = metrics.map((m) => {
    const lessonScore = normalise(m.lessonCompletions, maxLesson);
    const courseCompletionScore = normalise(m.courseCompletions, maxCourse);
    const assessmentScore = normalise(m.assessmentEvents, maxAssessment);
    const returningLearnerScore = normalise(m.returningLearners, maxReturning);
    const ratingScore = normalise(m.ratingSum, maxRating);

    const weighted =
      lessonScore * BigInt(weights.lessonCompletionBps) +
      courseCompletionScore * BigInt(weights.courseCompletionBps) +
      assessmentScore * BigInt(weights.assessmentBps) +
      returningLearnerScore * BigInt(weights.returningLearnerBps) +
      ratingScore * BigInt(weights.ratingBps);

    return {
      ...m,
      lessonScore,
      courseCompletionScore,
      assessmentScore,
      returningLearnerScore,
      ratingScore,
      finalScore: divRoundHalfUp(weighted, 10000n),
      poolSharePpm: 0n,
    } as TeacherScore;
  });

  // Deterministic order: highest score first, teacherId breaks ties.
  scored.sort((a, b) => (a.finalScore === b.finalScore ? a.teacherId.localeCompare(b.teacherId) : a.finalScore > b.finalScore ? -1 : 1));

  const total = scored.reduce((acc, s) => acc + s.finalScore, 0n);
  if (total === 0n) return scored;

  // Largest-remainder allocation so the shares add up to exactly 100% with no rounding drift.
  const parts = scored.map((s, index) => ({
    index,
    floor: (s.finalScore * SHARE_SCALE) / total,
    remainder: (s.finalScore * SHARE_SCALE) % total,
  }));
  let leftover = SHARE_SCALE - parts.reduce((acc, p) => acc + p.floor, 0n);
  const byRemainder = [...parts].sort((a, b) =>
    a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
  );
  for (const p of byRemainder) {
    if (leftover <= 0n) break;
    p.floor += 1n;
    leftover -= 1n;
  }
  for (const p of parts) scored[p.index].poolSharePpm = p.floor;

  return scored;
}