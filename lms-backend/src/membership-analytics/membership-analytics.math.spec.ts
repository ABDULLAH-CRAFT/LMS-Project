import { averagePaise, averageRating, derivePayoutStatus, ratioPercent, scoreContribution } from './membership-analytics.math';

describe('membership analytics maths', () => {
  it('ratioPercent rounds half-up and handles an empty denominator', () => {
    expect(ratioPercent(1, 3)).toBe('33.33');
    expect(ratioPercent(2, 3)).toBe('66.67');
    expect(ratioPercent(5, 5)).toBe('100.00');
    expect(ratioPercent(0, 10)).toBe('0.00');
    expect(ratioPercent(3, 0)).toBeNull();
  });

  it('averagePaise divides exactly in integer paise', () => {
    expect(averagePaise(5990000n, 10)).toBe('5990.00'); // 59,900.00 / 10 -> 5,990.00 (value given in paise)
    expect(averagePaise(100n, 3)).toBe('0.33');
    expect(averagePaise(0n, 0)).toBeNull();
  });

  it('averageRating keeps two decimals', () => {
    expect(averageRating(9, 2)).toBe('4.50');
    expect(averageRating(14, 3)).toBe('4.67');
    expect(averageRating(0, 0)).toBeNull();
  });

  it('scoreContribution applies the weight in basis points', () => {
    expect(scoreContribution(1000000n, 4000)).toBe(400000n); // 100.00 x 40% = 40.00
    expect(scoreContribution(824000n, 0)).toBe(0n);
  });

  it('payout status follows the period until R13', () => {
    expect(derivePayoutStatus('CALCULATED')).toBe('NOT_FINALIZED');
    expect(derivePayoutStatus('FINALIZED')).toBe('PENDING');
    expect(derivePayoutStatus('PAYOUT_PROCESSING')).toBe('PROCESSING');
    expect(derivePayoutStatus('PAID')).toBe('PAID');
  });
});