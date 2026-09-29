import { divRoundHalfUp, percentOf } from './money.util';

export interface SplitResult {
  platformPaise: bigint;
  teacherPaise: bigint;
}

/**
 * Deterministic split of a positive amount.
 * Rule: platform share is rounded half-up to the paisa, the teacher gets the
 * remainder. So platform + teacher always equals the amount exactly.
 */
export function splitAmount(amountPaise: bigint, platformBps: bigint, teacherBps: bigint): SplitResult {
  if (amountPaise <= 0n) throw new Error('Amount to split must be positive');
  if (platformBps + teacherBps !== 10000n) throw new Error('Platform and teacher percentages must total 100');
  const platformPaise = percentOf(amountPaise, platformBps);
  return { platformPaise, teacherPaise: amountPaise - platformPaise };
}

export interface RemainingShare {
  key: string; // e.g. "PLATFORM:" or "TEACHER:<userId>"
  remainingPaise: bigint; // what is still un-reversed for this recipient (>= 0)
}

/**
 * Splits a reversal (refund / chargeback) across recipients in proportion to
 * what each one still holds. Returns POSITIVE paise per key; the ledger stores
 * them negated. The last recipient absorbs the rounding remainder, and a
 * reversal equal to the full remaining amount returns each recipient's exact
 * remainder, so repeated partial refunds can never over- or under-reverse.
 */
export function proportionalReversal(shares: RemainingShare[], reversalPaise: bigint): Map<string, bigint> {
  if (shares.length === 0) throw new Error('No allocations to reverse');
  if (reversalPaise <= 0n) throw new Error('Reversal amount must be positive');

  const total = shares.reduce((sum, share) => sum + share.remainingPaise, 0n);
  if (reversalPaise > total) throw new Error('Reversal exceeds the remaining allocated amount');

  const result = new Map<string, bigint>();

  if (reversalPaise === total) {
    for (const share of shares) result.set(share.key, share.remainingPaise);
    return result;
  }

  let allocated = 0n;
  shares.forEach((share, index) => {
    const isLast = index === shares.length - 1;
    const value = isLast
      ? reversalPaise - allocated
      : divRoundHalfUp(share.remainingPaise * reversalPaise, total);
    if (value < 0n || value > share.remainingPaise) {
      throw new Error(`Reversal rounding violated the invariant for ${share.key}`);
    }
    result.set(share.key, value);
    allocated += value;
  });

  return result;
}