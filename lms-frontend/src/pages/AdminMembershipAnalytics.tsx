import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import { adminSidebarSections } from '../config/adminSidebar';
import { formatDateTime, formatMoney } from '../lib/financeFormat';
import { getMembershipOverview, getMembershipPeriodAnalytics } from '../lib/api/membershipAnalytics';
import { getMembershipPeriods } from '../lib/api/membershipPeriods';
import type {
  AnalyticsCalculation,
  AnalyticsTeacher,
  MembershipPeriodAnalytics,
  TeacherPayoutStatus,
} from '../types/membershipAnalytics';

const th = 'px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap text-left';
const td = 'px-4 py-3 text-sm text-text whitespace-nowrap';
const select = 'rounded-xl border border-border bg-background px-3 py-2 text-sm text-text';

// Display only: the backend stores exact integers (score x 10,000 and share x 1,000,000).
const score = (scaled: string, scale: number) => (Number(scaled) / scale).toFixed(2);
const share = (ppm: number, scale: number) => ((ppm / scale) * 100).toFixed(2) + '%';
const bpsToText = (bps: number) => (bps / 100).toFixed(2) + '%';
const percentOrDash = (value: string | null) => (value === null ? '—' : `${value}%`);

function monthLabel(periodStart: string): string {
  return new Date(`${periodStart}T00:00:00`).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message ?? error.message;
  }
  return 'Something went wrong';
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-surface rounded-2xl shadow-soft p-4">
      <p className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-text mt-1">{value}</p>
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  );
}

const PAYOUT_BADGE: Record<TeacherPayoutStatus, { label: string; className: string }> = {
  NOT_FINALIZED: { label: 'Not finalized', className: 'bg-gray-100 text-gray-700' },
  PENDING: { label: 'Pending payout', className: 'bg-primary-100 text-primary-700' },
  PROCESSING: { label: 'Processing', className: 'bg-yellow-100 text-yellow-800' },
  PAID: { label: 'Paid', className: 'bg-secondary-100 text-secondary-700' },
};

function PayoutBadge({ status }: { status: TeacherPayoutStatus }) {
  const badge = PAYOUT_BADGE[status];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}>{badge.label}</span>;
}

function CalculationBanner({ calc, status }: { calc: AnalyticsCalculation; status: string }) {
  return (
    <p className="text-xs text-muted mb-3">
      {calc.isFinal ? (
        <span className="rounded-full bg-secondary-100 text-secondary-700 px-2 py-0.5 font-semibold mr-2">Final · {status}</span>
      ) : (
        <span className="rounded-full bg-primary-100 text-primary-700 px-2 py-0.5 font-semibold mr-2">
          Preview · not finalized
        </span>
      )}
      Calculation #{calc.runNumber} · {formatDateTime(calc.calculatedAt)}
      {calc.calculatedByName ? ` by ${calc.calculatedByName}` : ''} · uses engagement run #{calc.engagementRunNumber}
      {calc.isPartialPeriod && ' · month not over when calculated'}
    </p>
  );
}

// ───────────────────────── Tab 1: overview ─────────────────────────

function OverviewTab({ periodId }: { periodId: string | null }) {
  const query = useQuery({
    queryKey: ['admin-membership-analytics-overview', periodId],
    queryFn: () => getMembershipOverview(periodId ?? undefined),
  });

  if (query.isLoading) return <p className="text-muted">Loading…</p>;
  if (query.isError) return <p className="text-sm text-red-600">{errorMessage(query.error)}</p>;
  if (!query.data) return null;

  const { rightNow, period, periodKpis: k, trend } = query.data;
  const maxNet = Math.max(1, ...trend.map((t) => Math.max(0, Number(t.netRevenue)))); // bar width only

  return (
    <>
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">Right now</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Active subscribers" value={String(rightNow.activeSubscribers)} hint={`${rightNow.cancellingAtPeriodEnd} set to cancel`} />
        <Stat label="Monthly recurring revenue" value={formatMoney(rightNow.monthlyRecurringRevenue)} hint="Latest paid month of each live subscription" />
        <Stat label="MRR at risk" value={formatMoney(rightNow.mrrAtRisk)} hint="From subscriptions set to cancel" />
        <Stat label="Past due / paused" value={`${rightNow.pastDue} / ${rightNow.paused}`} />
      </div>

      {period && k && (
        <>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mt-8 mb-2">
            {monthLabel(period.periodStart)}
            {period.isPartial && <span className="ml-2 rounded-full bg-primary-100 text-primary-700 px-2 py-0.5 text-xs normal-case">month in progress</span>}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="New subscribers" value={String(k.newSubscribers)} />
            <Stat label="Cancelled" value={String(k.cancelledSubscriptions)} hint={`${k.cancellationRequests} cancellation requests this month`} />
            <Stat label="Expired" value={String(k.expiredSubscriptions)} />
            <Stat label="Churn rate" value={percentOrDash(k.churnRatePercent)} hint={`${k.lostSubscribers} lost of ${k.activeAtStart} active at start`} />
            <Stat
              label="Renewal rate"
              value={percentOrDash(k.renewalRatePercent)}
              hint={`${k.renewalsRenewed} renewed, ${k.renewalsLapsed} lapsed${k.renewalsPending ? `, ${k.renewalsPending} still in grace` : ''}`}
            />
            <Stat label="Membership revenue (net)" value={formatMoney(k.netRevenue)} hint={`${formatMoney(k.grossRevenue)} collected − ${formatMoney(k.refundsAmount)} refunds`} />
            <Stat
              label="Avg revenue / subscriber"
              value={k.averageRevenuePerSubscriber === null ? '—' : formatMoney(k.averageRevenuePerSubscriber)}
              hint={`${k.payingSubscribers} paying subscribers`}
            />
            <Stat label="Active at end" value={String(k.activeAtEnd)} hint={`${k.paymentCount} payments`} />
          </div>
          <p className="text-xs text-muted mt-2">
            A renewal counts if the next paid month starts within {query.data.renewalGraceDays} days of the previous one ending. Subscriptions are
            counted per student and plan.
          </p>
        </>
      )}

      <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mt-8 mb-2">Last {trend.length} periods</h2>
      <div className="bg-surface rounded-2xl shadow-soft overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              <th className={th}>Month</th>
              <th className={th}>Status</th>
              <th className={th}>New</th>
              <th className={th}>Paying</th>
              <th className={th}>Collected</th>
              <th className={th}>Refunds</th>
              <th className={th}>Net revenue</th>
              <th className={`${th} w-48`} />
            </tr>
          </thead>
          <tbody>
            {trend.length === 0 && (
              <tr>
                <td className={td} colSpan={8}>No revenue periods yet.</td>
              </tr>
            )}
            {trend.map((t) => (
              <tr key={t.periodId} className="border-b border-border last:border-0">
                <td className={td}>{monthLabel(t.periodStart)}</td>
                <td className={td}>{t.status}</td>
                <td className={td}>{t.newSubscribers}</td>
                <td className={td}>{t.payingSubscribers}</td>
                <td className={td}>{formatMoney(t.grossRevenue)}</td>
                <td className={td}>{formatMoney(t.refundsAmount)}</td>
                <td className={`${td} font-semibold`}>{formatMoney(t.netRevenue)}</td>
                <td className="px-4 py-3">
                  <div className="h-2 rounded-full bg-primary-100 w-40">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-primary-600 to-secondary-400"
                      style={{ width: `${Math.round((Math.max(0, Number(t.netRevenue)) / maxNet) * 100)}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ───────────────────────── Tab 2: revenue split + teacher pool ─────────────────────────

function RevenueBreakdown({ data }: { data: MembershipPeriodAnalytics }) {
  const calc = data.calculation;
  if (!calc) {
    return (
      <div className="bg-surface rounded-2xl shadow-soft p-4 text-sm text-muted">
        This period has not been calculated yet. Collected so far: {formatMoney(data.live.grossRevenue)} from {data.live.paymentCount} payments, with{' '}
        {formatMoney(data.live.refundsAmount)} refunded.{' '}
        <Link to="/admin/membership-periods" className="text-primary-700 underline">
          Calculate it on the Revenue Periods page
        </Link>
        .
      </div>
    );
  }

  const platformPct = Number(calc.platformPercentage); // bar width only

  return (
    <>
      <CalculationBanner calc={calc} status={data.period.status} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label="Gross collected" value={formatMoney(calc.grossRevenue)} hint={`${calc.paymentCount} payments`} />
        <Stat label="Refunds" value={formatMoney(calc.refundsAmount)} hint={`${calc.reversalCount} reversals`} />
        <Stat label="Tax removed" value={formatMoney(calc.taxAmount)} hint={`${calc.taxRatePercent}% included in price`} />
        <Stat label="Eligible revenue" value={formatMoney(calc.eligibleRevenue)} />
        <Stat label="LMS share" value={formatMoney(calc.platformRevenue)} hint={`${calc.platformPercentage}%`} />
        <Stat label="Teacher pool" value={formatMoney(calc.teacherPool)} hint={`${calc.teacherPercentage}%`} />
      </div>

      <div className="mt-4 bg-surface rounded-2xl shadow-soft p-4">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Eligible revenue split</p>
        <div className="flex h-3 rounded-full overflow-hidden bg-primary-100">
          <div className="bg-primary-600" style={{ width: `${platformPct}%` }} title={`LMS ${calc.platformPercentage}%`} />
          <div className="bg-secondary-400" style={{ width: `${100 - platformPct}%` }} title={`Teacher pool ${calc.teacherPercentage}%`} />
        </div>
        <div className="flex justify-between text-xs text-muted mt-1">
          <span>LMS {calc.platformPercentage}%</span>
          <span>Teacher pool {calc.teacherPercentage}%</span>
        </div>
        {Number(calc.undistributedAmount) > 0 && (
          <p className="text-xs text-red-600 mt-3">
            {formatMoney(calc.undistributedAmount)} of the teacher pool is undistributed (no teacher earned an engagement score).
          </p>
        )}
      </div>
    </>
  );
}

function PoolTable({ data }: { data: MembershipPeriodAnalytics }) {
  const calc = data.calculation;
  if (!calc) return null;

  return (
    <div className="bg-surface rounded-2xl shadow-soft mt-4">
      <div className="px-4 py-3 border-b border-border text-sm font-semibold text-text">Teacher pool breakdown</div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              <th className={th}>Teacher</th>
              <th className={th}>Engagement score</th>
              <th className={th}>Pool %</th>
              <th className={th}>Membership earnings</th>
              <th className={th}>Adjustments</th>
              <th className={th}>Net earnings</th>
              <th className={th}>Payout status</th>
            </tr>
          </thead>
          <tbody>
            {data.teachers.length === 0 && (
              <tr>
                <td className={td} colSpan={7}>No teacher earned an engagement score in this period.</td>
              </tr>
            )}
            {data.teachers.map((t) => (
              <tr key={t.teacherId} className="border-b border-border last:border-0">
                <td className={td}>{t.teacherName}</td>
                <td className={td}>{score(t.finalScore, calc.scoreScale)}</td>
                <td className={td}>{share(t.poolSharePpm, calc.shareScale)}</td>
                <td className={td}>{formatMoney(t.membershipEarnings)}</td>
                <td className={td}>{formatMoney(t.adjustments)}</td>
                <td className={`${td} font-semibold`}>{formatMoney(t.netEarnings)}</td>
                <td className={td}><PayoutBadge status={t.payoutStatus} /></td>
              </tr>
            ))}
          </tbody>
          {data.totals && data.teachers.length > 0 && (
            <tfoot className="border-t border-border">
              <tr>
                <td className={`${td} font-semibold`} colSpan={3}>Total distributed</td>
                <td className={`${td} font-semibold`}>{formatMoney(data.totals.membershipEarnings)}</td>
                <td className={td} colSpan={3}>
                  {data.totals.matchesDistributedAmount ? (
                    <span className="text-secondary-700 text-xs">Matches the frozen calculation</span>
                  ) : (
                    <span className="text-red-600 text-xs font-semibold">Does not match the frozen calculation - investigate</span>
                  )}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="px-4 py-3 text-xs text-muted border-t border-border">
        Refunds that arrive after a period is finalized are booked into the next open period, so a finalized month never changes. Payout status follows
        the period until payouts arrive in a later phase.
      </p>
    </div>
  );
}

function PoolTab({ periodId }: { periodId: string | null }) {
  const query = useQuery({
    queryKey: ['admin-membership-analytics-period', periodId],
    queryFn: () => getMembershipPeriodAnalytics(periodId as string),
    enabled: !!periodId,
  });

  if (!periodId) return <p className="text-muted">No revenue period available yet.</p>;
  if (query.isLoading) return <p className="text-muted">Loading…</p>;
  if (query.isError) return <p className="text-sm text-red-600">{errorMessage(query.error)}</p>;
  if (!query.data) return null;

  return (
    <>
      <RevenueBreakdown data={query.data} />
      <PoolTable data={query.data} />
      <p className="text-xs text-muted mt-3">
        Need to calculate or finalize this month?{' '}
        <Link to="/admin/membership-periods" className="text-primary-700 underline">Open Revenue Periods</Link>.
      </p>
    </>
  );
}

// ───────────────────────── Tab 3: engagement analytics ─────────────────────────

function ContributionBar({ teacher, calc }: { teacher: AnalyticsTeacher; calc: AnalyticsCalculation }) {
  const parts = [
    { key: 'lesson', label: 'Lessons', color: 'bg-primary-600' },
    { key: 'courseCompletion', label: 'Courses', color: 'bg-secondary-500' },
    { key: 'assessment', label: 'Assessments', color: 'bg-yellow-400' },
    { key: 'returningLearner', label: 'Returning', color: 'bg-primary-300' },
    { key: 'rating', label: 'Ratings', color: 'bg-secondary-300' },
  ] as const;
  const total = Math.max(1, Number(teacher.finalScore)); // bar width only

  return (
    <div>
      <div className="flex h-2 w-40 rounded-full overflow-hidden bg-primary-100">
        {parts.map((p) => (
          <div
            key={p.key}
            className={p.color}
            style={{ width: `${(Number(teacher.scoreContributions[p.key]) / total) * 100}%` }}
            title={`${p.label}: ${score(teacher.scoreContributions[p.key], calc.scoreScale)} pts`}
          />
        ))}
      </div>
    </div>
  );
}

function EngagementTab({ periodId }: { periodId: string | null }) {
  const query = useQuery({
    queryKey: ['admin-membership-analytics-period', periodId],
    queryFn: () => getMembershipPeriodAnalytics(periodId as string),
    enabled: !!periodId,
  });

  if (!periodId) return <p className="text-muted">No revenue period available yet.</p>;
  if (query.isLoading) return <p className="text-muted">Loading…</p>;
  if (query.isError) return <p className="text-sm text-red-600">{errorMessage(query.error)}</p>;
  if (!query.data) return null;

  const calc = query.data.calculation;
  if (!calc) {
    return (
      <div className="bg-surface rounded-2xl shadow-soft p-4 text-sm text-muted">
        Engagement scores are stored with each period calculation. Calculate this period first on the{' '}
        <Link to="/admin/membership-periods" className="text-primary-700 underline">Revenue Periods</Link> page.
      </div>
    );
  }

  const w = calc.weights;

  return (
    <>
      <CalculationBanner calc={calc} status={query.data.period.status} />
      <div className="bg-surface rounded-2xl shadow-soft mt-2">
        <div className="px-4 py-3 border-b border-border text-xs text-muted">
          Weights used: lessons {bpsToText(w.lessonCompletionBps)}, courses {bpsToText(w.courseCompletionBps)}, assessments {bpsToText(w.assessmentBps)},
          returning learners {bpsToText(w.returningLearnerBps)}, ratings {bpsToText(w.ratingBps)}. Only trusted, point-earning events from learners with
          membership access count.
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className={th}>Teacher</th>
                <th className={th}>Active learners</th>
                <th className={th}>Lesson completions</th>
                <th className={th}>Course completions</th>
                <th className={th}>Assessment activity</th>
                <th className={th}>Returning learners</th>
                <th className={th}>Avg rating</th>
                <th className={th}>Score</th>
                <th className={th}>Score mix</th>
                <th className={th}>Pool %</th>
                <th className={th}>Earnings</th>
              </tr>
            </thead>
            <tbody>
              {query.data.teachers.length === 0 && (
                <tr>
                  <td className={td} colSpan={11}>No teacher earned an engagement score in this period.</td>
                </tr>
              )}
              {query.data.teachers.map((t) => (
                <tr key={t.teacherId} className="border-b border-border last:border-0">
                  <td className={td}>{t.teacherName}</td>
                  <td className={td}>{t.activeLearners}</td>
                  <td className={td}>{t.lessonCompletions}</td>
                  <td className={td}>{t.courseCompletions}</td>
                  <td className={td}>{t.assessmentActivity}</td>
                  <td className={td}>{t.returningLearners}</td>
                  <td className={td}>{t.averageRating === null ? '—' : `${t.averageRating} (${t.ratingCount})`}</td>
                  <td className={`${td} font-semibold`}>{score(t.finalScore, calc.scoreScale)}</td>
                  <td className="px-4 py-3"><ContributionBar teacher={t} calc={calc} /></td>
                  <td className={td}>{share(t.poolSharePpm, calc.shareScale)}</td>
                  <td className={`${td} font-semibold`}>{formatMoney(t.membershipEarnings)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-3 text-xs text-muted border-t border-border">
          Score mix bar, left to right: lessons, courses, assessments, returning learners, ratings. Hover a segment for its points. Lesson completions are
          capped per learner per teacher each month.
        </p>
      </div>
    </>
  );
}

// ───────────────────────── page ─────────────────────────

type Tab = 'overview' | 'pool' | 'engagement';

export default function AdminMembershipAnalytics() {
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

  const periodsQuery = useQuery({ queryKey: ['admin-membership-periods'], queryFn: getMembershipPeriods });
  // The overview picks the current period when none is chosen; reuse its answer for the other tabs.
  const defaultOverview = useQuery({
    queryKey: ['admin-membership-analytics-overview', null],
    queryFn: () => getMembershipOverview(),
    enabled: selectedPeriodId === null,
  });
  const effectivePeriodId = selectedPeriodId ?? defaultOverview.data?.period?.id ?? null;

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'pool' as const, label: 'Revenue & teacher pool' },
    { id: 'engagement' as const, label: 'Engagement' },
  ];

  return (
    <DashboardLayout sidebarSections={adminSidebarSections}>
      <h1 className="text-3xl font-bold text-text mb-1">Membership Analytics</h1>
      <p className="text-muted mb-6">Subscriber health, membership revenue, the teacher pool and the engagement behind it.</p>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={[
                'px-4 py-1.5 rounded-full text-sm font-medium transition',
                tab === item.id ? 'bg-primary-100 text-primary-700 border border-primary-200' : 'bg-surface text-muted hover:text-text shadow-soft',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className="ml-auto flex items-center gap-2 text-sm text-muted">
          Period
          <select
            className={select}
            value={effectivePeriodId ?? ''}
            onChange={(e) => setSelectedPeriodId(e.target.value || null)}
          >
            {(periodsQuery.data ?? []).map((p) => (
              <option key={p.periodId} value={p.periodId}>
                {monthLabel(p.periodStart)} · {p.status}
              </option>
            ))}
          </select>
        </label>
      </div>

      {tab === 'overview' && <OverviewTab periodId={effectivePeriodId} />}
      {tab === 'pool' && <PoolTab periodId={effectivePeriodId} />}
      {tab === 'engagement' && <EngagementTab periodId={effectivePeriodId} />}
    </DashboardLayout>
  );
}