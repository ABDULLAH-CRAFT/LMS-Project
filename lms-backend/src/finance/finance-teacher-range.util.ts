import { rangeView, resolveRange } from './finance-range.util';
import type { RangePreset } from './finance-range.util';

export type TeacherRangePreset = RangePreset | 'all';

export interface TeacherRange {
  preset: TeacherRangePreset;
  from: Date; // inclusive instant
  to: Date; // exclusive instant
  view: { preset: TeacherRangePreset; from: string | null; to: string | null };
}

// Teachers also get an "all time" option. Everything else is delegated to the R4 resolver,
// which rejects unknown presets and bad dates with a 400.
export function resolveTeacherRange(preset: string | undefined, from?: string, to?: string): TeacherRange {
  const chosen = preset ?? 'all';
  if (chosen === 'all') {
    return {
      preset: 'all',
      from: new Date('2000-01-01T00:00:00Z'),
      to: new Date('2100-01-01T00:00:00Z'),
      view: { preset: 'all', from: null, to: null },
    };
  }
  const range = resolveRange(chosen, from, to);
  return { preset: range.preset, from: range.from, to: range.to, view: rangeView(range) };
}