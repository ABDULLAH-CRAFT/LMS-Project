import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '../components/DashboardLayout';
import { teacherSidebarSections } from '../config/teacherSidebar';
import { getTeacherMembershipEarnings } from '../lib/api/teacherMembership';
import { formatMoney, formatDateTime } from '../lib/financeFormat';
import type { MembershipCategoryKey, TeacherMembershipPeriod } from '../types/teacherMembership';

const th = 'px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap';
const td = 'px-4 py-3 text-sm text-text whitespace-nowrap';

function monthLabel(periodStart: string): string {
  const [year, month] = periodStart.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-surface rounded-2xl shadow-soft p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-bold mt-1 text-text">{value}</p>
      {hint && <p className="text-[11px] text-muted mt-1">{hint}</p>}
    </div>
  );
}

function StateBadge({ state }: { state: TeacherMembershipPeriod['state'] }) {
  return state === 'FINAL' ? (
    <span className="rounded-full bg-success-bg text-success px-2 py-0.5 text-xs font-medium">Final</span>
  ) : (
    <span className="rounded-full bg-warning-bg text-warning px-2 py-0.5 text-xs font-medium">Provisional</span>
  );
}

// Which raw activity count sits behind each category (display only).
function activityFor(key: MembershipCategoryKey, p: TeacherMembershipPeriod): string {
  switch (key) {
    case 'LESSON_COMPLETION':
      return String(p.metrics.lessonCompletions);
    case 'COURSE_COMPLETION':
      return String(p.metrics.courseCompletions);
    case 'ASSESSMENT':
      return String(p.metrics.assessmentEvents);
    case 'RETURNING_LEARNERS':
      return String(p.metrics.returningLearners);
    default:
      return '—';
  }
}

export default function TeacherMembershipEarnings() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['teacher-membership-earnings'],
    queryFn: () => getTeacherMembershipEarnings(12),
  });

  const data = query.data;
  const selected = data?.periods.find((p) => p.periodId === selectedId) ?? data?.periods[0];

  return (
    <DashboardLayout sidebarSections={teacherSidebarSections}>
      <h1 className="text-3xl font-bold text-text mb-1">Membership Earnings</h1>
      <p className="text-muted mb-8">
        Members' fees go into a monthly pool. Your share of that pool depends on your engagement score for the month, so
        you can see exactly why you earned what you did.
      </p>

      {query.isLoading && <p className="text-sm text-muted">Loading membership earnings...</p>}
      {query.isError && <p className="text-sm text-danger-600">Couldn't load membership earnings.</p>}

      {data && (
        <div className="space-y-6 max-w-5xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Finalized membership earnings" value={formatMoney(data.summary.finalizedEarnings)} hint="Included in your total earnings" />
            <StatCard label="Provisional (not final yet)" value={formatMoney(data.summary.provisionalEarnings)} hint="Can still change until the month is finalized" />
            <StatCard label="Finalized months" value={String(data.summary.finalizedPeriods)} />
          </div>

          {data.periods.length === 0 && (
            <div className="bg-surface rounded-2xl shadow-soft p-6 text-sm text-muted">
              No membership earnings yet. Your share appears here once learners with a membership engage with your courses
              and the month is calculated.
            </div>
          )}

          {data.periods.length > 0 && selected && (
            <>
              <div className="bg-surface rounded-2xl shadow-soft overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-surface-strong/60">
                      <tr>
                        <th className={th}>Month</th>
                        <th className={th}>Status</th>
                        <th className={`${th} text-right`}>Engagement score</th>
                        <th className={`${th} text-right`}>Pool share</th>
                        <th className={`${th} text-right`}>Membership pool</th>
                        <th className={`${th} text-right`}>Your earnings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.periods.map((p) => (
                        <tr
                          key={p.periodId}
                          onClick={() => setSelectedId(p.periodId)}
                          className={[
                            'border-t border-border cursor-pointer hover:bg-surface-strong/40 transition',
                            p.periodId === selected.periodId ? 'bg-primary-50/40' : '',
                          ].join(' ')}
                        >
                          <td className={td}>{monthLabel(p.periodStart)}</td>
                          <td className={td}><StateBadge state={p.state} /></td>
                          <td className={`${td} text-right`}>{p.finalScore}</td>
                          <td className={`${td} text-right`}>{p.teacherPoolSharePercent}%</td>
                          <td className={`${td} text-right`}>{formatMoney(p.teacherPool)}</td>
                          <td className={`${td} text-right font-semibold`}>{formatMoney(p.earnings)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-surface rounded-2xl shadow-soft p-5 space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-lg font-semibold text-text">{monthLabel(selected.periodStart)} membership</p>
                  <StateBadge state={selected.state} />
                </div>

                {selected.state === 'PROVISIONAL' && (
                  <p className="text-xs rounded-xl bg-warning-bg text-warning px-3 py-2">
                    This month is not final yet
                    {selected.isPartialPeriod ? ' (it is still running)' : ''}. Learner activity and refunds can still change
                    these numbers, and this amount is not part of your total earnings until the month is finalized.
                  </p>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Engagement score" value={selected.finalScore} hint="Out of 100" />
                  <StatCard label="Your share of the teacher pool" value={`${selected.teacherPoolSharePercent}%`} />
                  <StatCard label="Membership teacher pool" value={formatMoney(selected.teacherPool)} />
                  <StatCard label="Your membership earnings" value={formatMoney(selected.earnings)} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-text mb-3">Why this score? (share of your final score)</p>
                  <div className="space-y-3">
                    {selected.categories.map((c) => (
                      <div key={c.key}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-text">{c.label}</span>
                          <span className="text-muted">{c.contributionPercent}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-surface-strong overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary-600 to-secondary-400"
                            style={{ width: `${Math.min(100, Number(c.contributionPercent))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-surface-strong/60">
                      <tr>
                        <th className={th}>Category</th>
                        <th className={`${th} text-right`}>Your activity</th>
                        <th className={`${th} text-right`}>Category score</th>
                        <th className={`${th} text-right`}>Weight</th>
                        <th className={`${th} text-right`}>Points added</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.categories.map((c) => (
                        <tr key={c.key} className="border-t border-border">
                          <td className={td}>{c.label}</td>
                          <td className={`${td} text-right`}>{activityFor(c.key, selected)}</td>
                          <td className={`${td} text-right`}>{c.score}</td>
                          <td className={`${td} text-right`}>{c.weightPercent}%</td>
                          <td className={`${td} text-right`}>{c.contributionPoints}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-border bg-surface-strong/40">
                        <td className={`${td} font-semibold`} colSpan={4}>Final engagement score</td>
                        <td className={`${td} text-right font-semibold`}>{selected.finalScore}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-muted">
                  Each category score compares you with the top teacher in that category (the top teacher scores 100).
                  Learners active in your courses this month: {selected.metrics.activeLearners}. Calculated{' '}
                  {formatDateTime(selected.calculatedAt)}
                  {selected.finalizedAt ? `, finalized ${formatDateTime(selected.finalizedAt)}` : ''}.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}