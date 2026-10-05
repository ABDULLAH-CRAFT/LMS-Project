import { bpsToPercent, divRoundHalfUp, fromPaise } from '../finance/money.util';

// Pure, deterministic, integer-only helpers (BigInt). No floats, no database, no clock.

/** numerator / denominator as a percentage string with 2 decimals ("12.50"), or null when there is nothing to divide by. */
export function ratioPercent(numerator: number, denominator: number): string | null {
  if (denominator <= 0) return null;
  const bps = divRoundHalfUp(BigInt(numerator) * 10000n, BigInt(denominator));
  return bpsToPercent(bps);
}

/** total money (paise) / count, rounded half-up to a whole paisa, as "599.00"; null when count is 0. */
export function averagePaise(totalPaise: bigint, count: number): string | null {
  if (count <= 0) return null;
  return fromPaise(divRoundHalfUp(totalPaise, BigInt(count)));
}

/** Average star rating with 2 decimals ("4.50"); null when nobody rated. */
export function averageRating(ratingSum: number, ratingCount: number): string | null {
  if (ratingCount <= 0) return null;
  return fromPaise(divRoundHalfUp(BigInt(ratingSum) * 100n, BigInt(ratingCount)));
}

/** A category score (already x scoreScale) times its weight in basis points = that category's share of the final score (same scale). */
export function scoreContribution(scaledScore: bigint, weightBps: number): bigint {
  return divRoundHalfUp(scaledScore * BigInt(weightBps), 10000n);
}

export type TeacherPayoutStatus = 'NOT_FINALIZED' | 'PENDING' | 'PROCESSING' | 'PAID';

/**
 * Until Phase R13 adds real payouts, the payout status of a teacher's membership earning follows the period:
 * only a FINALIZED period has money that can be paid out.
 */
export function derivePayoutStatus(periodStatus: string): TeacherPayoutStatus {
  switch (periodStatus) {
    case 'FINALIZED':
      return 'PENDING';
    case 'PAYOUT_PROCESSING':
      return 'PROCESSING';
    case 'PAID':
      return 'PAID';
    default:
      return 'NOT_FINALIZED';
  }
}