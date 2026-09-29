import { useMemo, useState } from 'react';
import type { FinanceRangeParams, RangePreset } from '../types/finance';

// Holds the date-range filter for a finance page. `enabled` is false while a custom range
// is incomplete or invalid, so no request is sent until it makes sense.
export function useFinanceRange(initialPreset: RangePreset = '30d') {
  const [preset, setPreset] = useState<RangePreset>(initialPreset);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const enabled = preset !== 'custom' || (from !== '' && to !== '' && from <= to);

  const params = useMemo<FinanceRangeParams>(
    () => (preset === 'custom' ? { preset, from, to } : { preset }),
    [preset, from, to],
  );

  return { preset, setPreset, from, setFrom, to, setTo, params, enabled };
}