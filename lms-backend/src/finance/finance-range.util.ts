import { BadRequestException } from '@nestjs/common';

export const RANGE_PRESETS = ['today', '7d', '30d', 'this_month', 'last_month', 'custom'] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export interface ResolvedRange {
  preset: RangePreset;
  from: Date; // inclusive instant
  to: Date; // exclusive instant
  fromDate: string; // "YYYY-MM-DD" (IST), inclusive - for display
  toDate: string; // "YYYY-MM-DD" (IST), inclusive - for display
}

// India has no daylight saving, so a fixed +05:30 offset is exact.
const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CUSTOM_DAYS = 366;

// Midnight IST of the given calendar day, as a real instant. Date.UTC normalises overflow
// (month 12 -> next year, day 0 -> last day of previous month), so date maths stays simple.
const istMidnight = (year: number, monthIndex: number, day: number): Date =>
  new Date(Date.UTC(year, monthIndex, day) - IST_OFFSET_MS);

const toIstDateString = (instant: Date): string =>
  new Date(instant.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

function parseDateOnly(value: string | undefined, field: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) {
    throw new BadRequestException(`${field} must be a date in YYYY-MM-DD format`);
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, monthIndex, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== monthIndex || check.getUTCDate() !== day) {
    throw new BadRequestException(`${field} is not a real calendar date`);
  }
  return { year, monthIndex, day };
}

/**
 * Turns ?preset=&from=&to= into a half-open [from, to) range of instants.
 * Never trusts the client: unknown presets and bad dates are rejected with 400.
 */
export function resolveRange(preset: string | undefined, from?: string, to?: string, now: Date = new Date()): ResolvedRange {
  const chosen = (preset ?? '30d') as RangePreset;
  if (!RANGE_PRESETS.includes(chosen)) {
    throw new BadRequestException(`preset must be one of: ${RANGE_PRESETS.join(', ')}`);
  }

  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const d = ist.getUTCDate();

  let start: Date;
  let end: Date;

  if (chosen === 'today') {
    start = istMidnight(y, m, d);
    end = istMidnight(y, m, d + 1);
  } else if (chosen === '7d') {
    start = istMidnight(y, m, d - 6);
    end = istMidnight(y, m, d + 1);
  } else if (chosen === '30d') {
    start = istMidnight(y, m, d - 29);
    end = istMidnight(y, m, d + 1);
  } else if (chosen === 'this_month') {
    start = istMidnight(y, m, 1);
    end = istMidnight(y, m + 1, 1);
  } else if (chosen === 'last_month') {
    start = istMidnight(y, m - 1, 1);
    end = istMidnight(y, m, 1);
  } else {
    const f = parseDateOnly(from, 'from');
    const t = parseDateOnly(to, 'to');
    start = istMidnight(f.year, f.monthIndex, f.day);
    end = istMidnight(t.year, t.monthIndex, t.day + 1); // "to" is inclusive
    if (end.getTime() <= start.getTime()) {
      throw new BadRequestException('"to" must be on or after "from"');
    }
    if ((end.getTime() - start.getTime()) / DAY_MS > MAX_CUSTOM_DAYS) {
      throw new BadRequestException(`Custom range cannot be longer than ${MAX_CUSTOM_DAYS} days`);
    }
  }

  return {
    preset: chosen,
    from: start,
    to: end,
    fromDate: toIstDateString(start),
    toDate: toIstDateString(new Date(end.getTime() - 1)),
  };
}

export const rangeView = (range: ResolvedRange) => ({
  preset: range.preset,
  from: range.fromDate,
  to: range.toDate,
});