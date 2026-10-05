import { SHARE_SCALE } from '../engagement/engagement-score.calculator';
import { divRoundHalfUp } from '../finance/money.util';
import { splitAmount } from '../finance/revenue-calculator';

// Pure, deterministic, integer-only maths (BigInt paise). No floats, no database, no clock.

export interface PeriodTotalsInput {
  grossPaise: bigint; // membership payments booked in the period (>= 0)
  refundsPaise: bigint; // refunds + chargebacks booked in the period, as a POSITIVE number (>= 0)
  taxRateBps: bigint; // tax already included in the price, in basis points (1800 = 18%). 0 = none.
  platformBps: bigint; // from the MEMBERSHIP_POOL revenue rule
  teacherBps: bigint;
}

export interface PeriodTotals {
  grossPaise: bigint;
  refundsPaise: bigint;
  taxPaise: bigint;
  eligiblePaise: bigint;
  platformPaise: bigint;
  teacherPoolPaise: bigint;
}

/**
 * eligible = max(gross - refunds, 0) - tax
 * tax      = net x rate / (100% + rate)   (the tax is INSIDE the collected price)
 * platform = round-half-up(eligible x platform%), teacher pool = the remainder (so they always add up).
 *
 * If refunds are larger than this period's payments (e.g. refunds of earlier months), eligible is
 * floored at 0. The shortfall is NOT carried forward - see the R10 notes.
 */
export function calculatePeriodTotals(input: PeriodTotalsInput): PeriodTotals {
  if (input.grossPaise < 0n || input.refundsPaise < 0n) throw new Error('Gross and refunds must not be negative');
  if (input.taxRateBps < 0n || input.taxRateBps > 10000n) throw new Error('Tax rate out of range');

  const net = input.grossPaise - input.refundsPaise;
  const base = net > 0n ? net : 0n;
  const taxPaise = base > 0n && input.taxRateBps > 0n ? divRoundHalfUp(base * input.taxRateBps, 10000n + input.taxRateBps) : 0n;
  const eligiblePaise = base - taxPaise;

  if (eligiblePaise === 0n) {
    return { grossPaise: input.grossPaise, refundsPaise: input.refundsPaise, taxPaise, eligiblePaise, platformPaise: 0n, teacherPoolPaise: 0n };
  }

  const { platformPaise, teacherPaise } = splitAmount(eligiblePaise, input.platformBps, input.teacherBps);
  return {
    grossPaise: input.grossPaise,
    refundsPaise: input.refundsPaise,
    taxPaise,
    eligiblePaise,
    platformPaise,
    teacherPoolPaise: teacherPaise,
  };
}

export interface PoolShare {
  teacherId: string;
  poolSharePpm: bigint; // the stored R9 share, parts per million
}

export interface PoolAmount {
  teacherId: string;
  amountPaise: bigint;
}

/**
 * Splits the teacher pool by the frozen R9 pool shares using largest-remainder rounding, so the amounts
 * add up to the pool EXACTLY. Ties go to the earlier teacher in `shares` (callers pass the stored order:
 * score descending, then teacherId ascending), so the result is reproducible from stored data.
 */
export function distributePool(poolPaise: bigint, shares: PoolShare[]): PoolAmount[] {
  if (poolPaise < 0n) throw new Error('Teacher pool must not be negative');

  const totalPpm = shares.reduce((acc, s) => acc + s.poolSharePpm, 0n);
  if (poolPaise === 0n || totalPpm === 0n) {
    return shares.map((s) => ({ teacherId: s.teacherId, amountPaise: 0n }));
  }
  if (totalPpm !== SHARE_SCALE) {
    throw new Error(`Pool shares must add up to exactly ${SHARE_SCALE} (got ${totalPpm})`);
  }

  const parts = shares.map((s, index) => ({
    index,
    floor: (poolPaise * s.poolSharePpm) / SHARE_SCALE,
    remainder: (poolPaise * s.poolSharePpm) % SHARE_SCALE,
  }));

  let leftover = poolPaise - parts.reduce((acc, p) => acc + p.floor, 0n);
  const byRemainder = [...parts].sort((a, b) => (a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1));
  for (const p of byRemainder) {
    if (leftover <= 0n) break;
    p.floor += 1n;
    leftover -= 1n;
  }

  return parts.map((p) => ({ teacherId: shares[p.index].teacherId, amountPaise: p.floor }));
}