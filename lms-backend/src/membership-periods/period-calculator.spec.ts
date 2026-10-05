import { calculatePeriodTotals, distributePool } from './period-calculator';

describe('calculatePeriodTotals', () => {
  it('matches the roadmap example: 10,00,000 collected, 20,000 refunded', () => {
    const t = calculatePeriodTotals({
      grossPaise: 100000000n,
      refundsPaise: 2000000n,
      taxRateBps: 0n,
      platformBps: 3000n,
      teacherBps: 7000n,
    });
    expect(t.eligiblePaise).toBe(98000000n); // 9,80,000
    expect(t.platformPaise).toBe(29400000n); // 2,94,000
    expect(t.teacherPoolPaise).toBe(68600000n); // 6,86,000
  });

  it('platform + pool always equals eligible, with odd amounts', () => {
    const t = calculatePeriodTotals({ grossPaise: 59901n, refundsPaise: 0n, taxRateBps: 0n, platformBps: 3000n, teacherBps: 7000n });
    expect(t.platformPaise + t.teacherPoolPaise).toBe(t.eligiblePaise);
  });

  it('floors eligible revenue at zero when refunds exceed payments', () => {
    const t = calculatePeriodTotals({ grossPaise: 10000n, refundsPaise: 50000n, taxRateBps: 0n, platformBps: 3000n, teacherBps: 7000n });
    expect(t.eligiblePaise).toBe(0n);
    expect(t.teacherPoolPaise).toBe(0n);
  });

  it('removes tax that is included in the price (18% GST on 1,180 = 180)', () => {
    const t = calculatePeriodTotals({ grossPaise: 118000n, refundsPaise: 0n, taxRateBps: 1800n, platformBps: 3000n, teacherBps: 7000n });
    expect(t.taxPaise).toBe(18000n);
    expect(t.eligiblePaise).toBe(100000n);
  });
});

describe('distributePool', () => {
  it('matches the roadmap example: 6,86,000 split 50/30/20', () => {
    const out = distributePool(68600000n, [
      { teacherId: 'a', poolSharePpm: 500000n },
      { teacherId: 'b', poolSharePpm: 300000n },
      { teacherId: 'c', poolSharePpm: 200000n },
    ]);
    expect(out.map((o) => o.amountPaise)).toEqual([34300000n, 20580000n, 13720000n]);
  });

  it('never loses or invents a paisa (3 equal shares of 100.01)', () => {
    const out = distributePool(10001n, [
      { teacherId: 'a', poolSharePpm: 333334n },
      { teacherId: 'b', poolSharePpm: 333333n },
      { teacherId: 'c', poolSharePpm: 333333n },
    ]);
    expect(out.reduce((acc, o) => acc + o.amountPaise, 0n)).toBe(10001n);
  });

  it('returns zero for everyone when nobody scored', () => {
    const out = distributePool(100000n, [{ teacherId: 'a', poolSharePpm: 0n }]);
    expect(out[0].amountPaise).toBe(0n);
  });

  it('rejects shares that do not add up to 100%', () => {
    expect(() => distributePool(1000n, [{ teacherId: 'a', poolSharePpm: 400000n }])).toThrow();
  });
});