import { divRoundHalfUp, fromPaise } from './money.util';
import type { WeightsBps } from '../engagement/engagement-score.calculator';

// Pure, integer-only (BigInt) display maths for the teacher's membership breakdown.
// Nothing here decides money: the rupee amount comes from the frozen membership_period_allocations row.
// This only explains HOW the stored score was built, using the stored category scores and the stored weights.

export type CategoryKey = 'LESSON_COMPLETION' | 'COURSE_COMPLETION' | 'ASSESSMENT' | 'RETURNING_LEARNERS' | 'RATINGS';

export interface CategoryScoresScaled {
  lessonScore: bigint; // 0..100 x 10000 (engagement_scores.lessonScore)
  courseCompletionScore: bigint;
  assessmentScore: bigint;
  returningLearnerScore: bigint;
  ratingScore: bigint;
}

export interface CategoryBreakdown {
  key: CategoryKey;
  label: string;
  score: string; // 0-100, 2 decimals - the teacher's score in this category
  weightPercent: string; // e.g. "40.00"
  contributionPoints: string; // points this category added to the final score, 2 decimals
  contributionPercent: string; // share of the final score, 1 decimal, all five add up to exactly 100.0
}

const fmtScore = (scaled: bigint): string => fromPaise(divRoundHalfUp(scaled, 100n)); // x10000 -> 2 decimals
const fmtPoints = (weighted: bigint): string => fromPaise(divRoundHalfUp(weighted, 1_000_000n)); // x10000 x bps -> 2 decimals
const fmtBps = (bps: number): string => fromPaise(BigInt(bps)); // 4000 -> "40.00"

/** Largest-remainder split of 1000 tenths-of-a-percent, so the five shares always add up to exactly 100.0. */
export function allocateTenths(contributions: bigint[]): bigint[] {
  const total = contributions.reduce((a, b) => a + b, 0n);
  if (total <= 0n) return contributions.map(() => 0n);
  const parts = contributions.map((c, index) => ({ index, floor: (c * 1000n) / total, remainder: (c * 1000n) % total }));
  let left = 1000n - parts.reduce((a, p) => a + p.floor, 0n);
  const order = [...parts].sort((a, b) => (a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1));
  for (const p of order) {
    if (left <= 0n) break;
    p.floor += 1n;
    left -= 1n;
  }
  return parts.map((p) => p.floor);
}

const fmtTenths = (tenths: bigint): string => `${tenths / 10n}.${tenths % 10n}`;

export function buildCategoryBreakdown(scores: CategoryScoresScaled, weights: WeightsBps): CategoryBreakdown[] {
  const rows: { key: CategoryKey; label: string; score: bigint; bps: number }[] = [
    { key: 'LESSON_COMPLETION', label: 'Lesson completions', score: scores.lessonScore, bps: weights.lessonCompletionBps },
    { key: 'COURSE_COMPLETION', label: 'Course completions', score: scores.courseCompletionScore, bps: weights.courseCompletionBps },
    { key: 'ASSESSMENT', label: 'Assessment activity', score: scores.assessmentScore, bps: weights.assessmentBps },
    { key: 'RETURNING_LEARNERS', label: 'Returning learners', score: scores.returningLearnerScore, bps: weights.returningLearnerBps },
    { key: 'RATINGS', label: 'Ratings & feedback', score: scores.ratingScore, bps: weights.ratingBps },
  ];
  const weighted = rows.map((r) => r.score * BigInt(r.bps));
  const tenths = allocateTenths(weighted);
  return rows.map((r, i) => ({
    key: r.key,
    label: r.label,
    score: fmtScore(r.score),
    weightPercent: fmtBps(r.bps),
    contributionPoints: fmtPoints(weighted[i]),
    contributionPercent: fmtTenths(tenths[i]),
  }));
}

export const formatFinalScore = fmtScore;

/** parts-per-million of the pool -> percent with 2 decimals (68000 ppm = "6.80"). */
export const ppmToPercent = (ppm: number): string => fromPaise(divRoundHalfUp(BigInt(ppm), 100n));