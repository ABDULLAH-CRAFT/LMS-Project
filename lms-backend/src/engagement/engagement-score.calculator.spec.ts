import { calculateTeacherScores, SHARE_SCALE, WeightsBps } from './engagement-score.calculator';

const W: WeightsBps = { lessonCompletionBps: 4000, courseCompletionBps: 3000, assessmentBps: 1500, returningLearnerBps: 1000, ratingBps: 500 };
const m = (teacherId: string, o: Partial<Record<string, number>> = {}) => ({
  teacherId, lessonCompletions: 0, courseCompletions: 0, assessmentEvents: 0, returningLearners: 0, ratingSum: 0, activeLearners: 0, ...o,
});

describe('calculateTeacherScores', () => {
  it('gives the best teacher in every category 100 and shares add up to exactly 100%', () => {
    const out = calculateTeacherScores(
      [
        m('a', { lessonCompletions: 100, courseCompletions: 10, assessmentEvents: 20, returningLearners: 5 }),
        m('b', { lessonCompletions: 50, courseCompletions: 5, assessmentEvents: 10, returningLearners: 5 }),
        m('c', { lessonCompletions: 25 }),
      ],
      W,
    );
    expect(out[0].teacherId).toBe('a');
    expect(out[0].finalScore).toBeGreaterThan(out[1].finalScore);
    expect(out[0].lessonScore).toBe(1_000_000n); // 100.0000
    expect(out.reduce((acc, s) => acc + s.poolSharePpm, 0n)).toBe(SHARE_SCALE);
  });

  it('is deterministic regardless of input order', () => {
    const rows = [m('x', { lessonCompletions: 7 }), m('y', { lessonCompletions: 7 }), m('z', { lessonCompletions: 7 })];
    const a = calculateTeacherScores(rows, W);
    const b = calculateTeacherScores([...rows].reverse(), W);
    expect(a.map((s) => [s.teacherId, s.poolSharePpm])).toEqual(b.map((s) => [s.teacherId, s.poolSharePpm]));
    expect(a.reduce((acc, s) => acc + s.poolSharePpm, 0n)).toBe(SHARE_SCALE);
  });

  it('returns zero shares when nobody scored', () => {
    const out = calculateTeacherScores([m('a'), m('b')], W);
    expect(out.every((s) => s.poolSharePpm === 0n && s.finalScore === 0n)).toBe(true);
  });

  it('rejects weights that do not add up to 100%', () => {
    expect(() => calculateTeacherScores([m('a')], { ...W, ratingBps: 600 })).toThrow();
  });
});