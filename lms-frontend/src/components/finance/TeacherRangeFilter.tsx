import type { TeacherRangePreset } from '../../types/teacherFinance';

const PRESETS: { value: TeacherRangePreset; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'custom', label: 'Custom' },
];

interface TeacherRangeFilterProps {
  preset: TeacherRangePreset;
  from: string;
  to: string;
  onPresetChange: (preset: TeacherRangePreset) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  resolvedLabel?: string;
}

const dateInputClass =
  'bg-surface-strong border border-border rounded-full px-3 py-1.5 text-xs text-text outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition';

export default function TeacherRangeFilter({
  preset,
  from,
  to,
  onPresetChange,
  onFromChange,
  onToChange,
  resolvedLabel,
}: TeacherRangeFilterProps) {
  const invalid = preset === 'custom' && from !== '' && to !== '' && from > to;

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onPresetChange(option.value)}
            className={[
              'px-3.5 py-1.5 rounded-full text-xs font-medium transition',
              preset === option.value
                ? 'bg-primary-100 text-primary-700 border border-primary-200'
                : 'bg-surface text-muted hover:text-text shadow-soft',
            ].join(' ')}
          >
            {option.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <input type="date" value={from} max={to || undefined} onChange={(e) => onFromChange(e.target.value)} className={dateInputClass} />
          <span className="text-xs text-muted">to</span>
          <input type="date" value={to} min={from || undefined} onChange={(e) => onToChange(e.target.value)} className={dateInputClass} />
        </div>
      )}

      {invalid && <p className="text-xs text-danger-600 mt-2">"From" must be on or before "To".</p>}
      {preset === 'custom' && (from === '' || to === '') && (
        <p className="text-xs text-muted mt-2">Pick both dates to load the report.</p>
      )}
      {resolvedLabel && <p className="text-xs text-muted mt-2">{resolvedLabel}</p>}
    </div>
  );
}