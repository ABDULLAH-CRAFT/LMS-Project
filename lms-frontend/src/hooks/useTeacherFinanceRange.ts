import { useMemo, useState } from 'react';
import type { TeacherRangeParams, TeacherRangePreset } from '../types/teacherFinance';

// Date-range filter state for the teacher earnings pages. `enabled` is false while a custom
// range is incomplete or invalid, so no request is sent until it makes sense.
export function useTeacherFinanceRange(initialPreset: TeacherRangePreset = 'all') {
  const [preset, setPreset] = useState<TeacherRangePreset>(initialPreset);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const enabled = preset !== 'custom' || (from !== '' && to !== '' && from <= to);

  const params = useMemo<TeacherRangeParams>(
    () => (preset === 'custom' ? { preset, from, to } : { preset }),
    [preset, from, to],
  );

  return { preset, setPreset, from, setFrom, to, setTo, params, enabled };
}