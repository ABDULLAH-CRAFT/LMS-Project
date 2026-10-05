import { allocateTenths, buildCategoryBreakdown, formatFinalScore, ppmToPercent } from './teacher-membership.math';

const WEIGHTS = { lessonCompletionBps: 4000, courseCompletionBps: 3000, assessmentBps: 1500, returningLearnerBps: 1000, ratingBps: 500 };

describe('teacher membership breakdown maths', () => {
  it('splits the final score into five shares that add up to exactly 100.0', () => {
    const rows = buildCategoryBreakdown(
      { lessonScore: 820000n, courseCompletionScore: 640000n, assessmentScore: 450000n, returningLearnerScore: 900000n, ratingScore: 1000000n },
      WEIGHTS,
    );
    const tenths = rows.reduce((acc, r) => acc + BigInt(r.contributionPercent.replace('.', '')), 0n);
    expect(tenths).toBe(1000n);
    expect(rows[0].weightPercent).toBe('40.00');
    expect(rows[0].score).toBe('82.00');
    expect(rows[0].contributionPoints).toBe('32.80');
  });

  it('returns zeros when the teacher has no score', () => {
    expect(allocateTenths([0n, 0n, 0n, 0n, 0n])).toEqual([0n, 0n, 0n, 0n, 0n]);
  });

  it('formats score and pool share', () => {
    expect(formatFinalScore(824000n)).toBe('82.40');
    expect(ppmToPercent(68000)).toBe('6.80');
  });
});