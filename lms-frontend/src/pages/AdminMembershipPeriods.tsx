import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import { adminSidebarSections } from '../config/adminSidebar';
import { formatDateTime, formatMoney } from '../lib/financeFormat';
import {
  calculateMembershipPeriod,
  createMembershipTaxConfig,
  finalizeMembershipPeriod,
  getMembershipPeriodDetail,
  getMembershipPeriods,
  getMembershipTaxConfigs,
} from '../lib/api/membershipPeriods';
import type { PeriodCalculation } from '../types/membershipPeriods';

const th = 'px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap text-left';
const td = 'px-4 py-3 text-sm text-text whitespace-nowrap';
const input = 'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text';
const primaryButton =
  'bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-5 py-2 rounded-full text-sm font-semibold disabled:opacity-40';

// Display only: the backend stores exact integers (score x 10,000 and share x 1,000,000).
const score = (scaled: string, scale: number) => (Number(scaled) / scale).toFixed(2);
const share = (ppm: number, scale: number) => ((ppm / scale) * 100).toFixed(2) + '%';

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

function CalculationBreakdown({ calc }: { calc: PeriodCalculation }) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
        <Stat label="Gross collected" value={formatMoney(calc.grossRevenue)} hint={`${calc.paymentCount} payments`} />
        <Stat label="Refunds" value={formatMoney(calc.refundsAmount)} hint={`${calc.reversalCount} reversals`} />
        <Stat label="Tax removed" value={formatMoney(calc.taxAmount)} hint={`${calc.taxRatePercent}% included in price`} />
        <Stat label="Eligible revenue" value={formatMoney(calc.eligibleRevenue)} />
        <Stat label="LMS share" value={formatMoney(calc.platformRevenue)} hint={`${calc.platformPercentage}%`} />
        <Stat label="Teacher pool" value={formatMoney(calc.teacherPool)} hint={`${calc.teacherPercentage}%`} />
      </div>

      {Number(calc.undistributedAmount) > 0 && (
        <p className="text-xs text-red-600 mt-3">
          {formatMoney(calc.undistributedAmount)} of the teacher pool is undistributed because no teacher earned an engagement score.
        </p>
      )}

      <div className="bg-surface rounded-2xl shadow-soft mt-4">
        <div className="px-4 py-3 border-b border-border text-xs text-muted">
          Calculation #{calc.runNumber} · {formatDateTime(calc.calculatedAt)}
          {calc.calculatedByName ? ` by ${calc.calculatedByName}` : ''} · uses engagement run #{calc.engagementRunNumber}
          {calc.isPartialPeriod && (
            <span className="ml-2 rounded-full bg-primary-100 text-primary-700 px-2 py-0.5">preview - period not over yet</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className={th}>Teacher</th>
                <th className={th}>Lessons</th>
                <th className={th}>Courses</th>
                <th className={th}>Assessments</th>
                <th className={th}>Returning</th>
                <th className={th}>Ratings</th>
                <th className={th}>Final score</th>
                <th className={th}>Pool share</th>
                <th className={th}>Earnings</th>
              </tr>
            </thead>
            <tbody>
              {calc.teachers.length === 0 && (
                <tr>
                  <td className={td} colSpan={9}>
                    No teacher earned an engagement score in this period.
                  </td>
                </tr>
              )}
              {calc.teachers.map((t) => (
                <tr key={t.teacherId} className="border-b border-border last:border-0">
                  <td className={td}>{t.teacherName}</td>
                  <td className={td}>{score(t.lessonScore, calc.scoreScale)}</td>
                  <td className={td}>{score(t.courseCompletionScore, calc.scoreScale)}</td>
                  <td className={td}>{score(t.assessmentScore, calc.scoreScale)}</td>
                  <td className={td}>{score(t.returningLearnerScore, calc.scoreScale)}</td>
                  <td className={td}>{score(t.ratingScore, calc.scoreScale)}</td>
                  <td className={td}>{score(t.finalScore, calc.scoreScale)}</td>
                  <td className={td}>{share(t.poolSharePpm, calc.shareScale)}</td>
                  <td className={`${td} font-semibold`}>{formatMoney(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function PeriodDetailPanel({ periodId }: { periodId: string }) {
  const queryClient = useQueryClient();
  const [refreshEngagement, setRefreshEngagement] = useState(false);
  const [acknowledge, setAcknowledge] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['admin-membership-period', periodId],
    queryFn: () => getMembershipPeriodDetail(periodId),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-membership-periods'] });
    queryClient.invalidateQueries({ queryKey: ['admin-membership-period', periodId] });
    queryClient.invalidateQueries({ queryKey: ['admin-membership-revenue'] });
  };

  const calculate = useMutation({
    mutationFn: () => calculateMembershipPeriod(periodId, refreshEngagement),
    onSuccess: refresh,
  });

  const finalize = useMutation({
    mutationFn: (calculationId: string) => finalizeMembershipPeriod(periodId, calculationId, acknowledge),
    onSuccess: refresh,
  });

  if (detailQuery.isLoading) return <p className="text-sm text-muted mt-4">Loading period…</p>;
  if (detailQuery.isError || !detailQuery.data) return <p className="text-sm text-red-600 mt-4">{errorMessage(detailQuery.error)}</p>;

  const { period, live, latestCalculation: calc, readiness, history } = detailQuery.data;
  const locked = ['FINALIZED', 'PAYOUT_PROCESSING', 'PAID'].includes(period.status);

  const onFinalize = () => {
    if (!calc) return;
    const ok = window.confirm(
      `Finalize ${period.periodStart} → ${period.periodEnd}?\n\nTeacher pool: ${formatMoney(calc.teacherPool)}\nThis freezes the calculation permanently. Later corrections can only be posted as adjustments.`,
    );
    if (ok) finalize.mutate(calc.id);
  };

  return (
    <div className="mt-6">
      <h2 className="text-lg font-bold text-text">
        {period.periodStart} → {period.periodEnd} <span className="text-sm font-medium text-muted">· {period.status}</span>
      </h2>
      {locked && (
        <p className="text-xs text-muted mt-1">
          Finalized {period.finalizedAt ? formatDateTime(period.finalizedAt) : ''}
          {period.finalizedByName ? ` by ${period.finalizedByName}` : ''}. These figures are frozen.
        </p>
      )}

      {!locked && (
        <div className="bg-surface rounded-2xl shadow-soft p-4 mt-4">
          <p className="text-xs text-muted mb-3">
            Live ledger right now: {live.paymentCount} payments, {formatMoney(live.grossRevenue)} collected, {formatMoney(live.refundsAmount)} refunded.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" className={primaryButton} disabled={calculate.isPending} onClick={() => calculate.mutate()}>
              {calculate.isPending ? 'Calculating…' : calc ? 'Recalculate' : 'Calculate'}
            </button>
            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={refreshEngagement} onChange={(e) => setRefreshEngagement(e.target.checked)} />
              Also refresh engagement scores
            </label>
            {calc && (
              <button
                type="button"
                className={primaryButton}
                disabled={!readiness.canFinalize || finalize.isPending || (readiness.requiresUndistributedAcknowledgement && !acknowledge)}
                onClick={onFinalize}
              >
                {finalize.isPending ? 'Finalizing…' : 'Finalize period'}
              </button>
            )}
            {calc && readiness.requiresUndistributedAcknowledgement && (
              <label className="flex items-center gap-2 text-xs text-red-600">
                <input type="checkbox" checked={acknowledge} onChange={(e) => setAcknowledge(e.target.checked)} />
                Keep the undistributed pool with the platform
              </label>
            )}
          </div>

          {readiness.blockers.length > 0 && (
            <ul className="mt-3 text-xs text-muted list-disc pl-5 space-y-1">
              {readiness.blockers.map((b) => (
                <li key={b.code} className={readiness.stale && b.code.startsWith('STALE') ? 'text-red-600' : ''}>
                  {b.message}
                </li>
              ))}
            </ul>
          )}
          {calculate.isError && <p className="text-sm text-red-600 mt-3">{errorMessage(calculate.error)}</p>}
          {finalize.isError && <p className="text-sm text-red-600 mt-3">{errorMessage(finalize.error)}</p>}
        </div>
      )}

      {!calc && <p className="text-sm text-muted mt-4">This period has not been calculated yet.</p>}
      {calc && <CalculationBreakdown calc={calc} />}

      {history.length > 1 && (
        <div className="bg-surface rounded-2xl shadow-soft overflow-x-auto mt-4">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className={th}>Run</th>
                <th className={th}>Calculated</th>
                <th className={th}>By</th>
                <th className={th}>Eligible revenue</th>
                <th className={th}>Teacher pool</th>
                <th className={th}>Teachers</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b border-border last:border-0">
                  <td className={td}>#{h.runNumber}</td>
                  <td className={td}>{formatDateTime(h.calculatedAt)}</td>
                  <td className={td}>{h.calculatedByName ?? '—'}</td>
                  <td className={td}>{formatMoney(h.eligibleRevenue)}</td>
                  <td className={td}>{formatMoney(h.teacherPool)}</td>
                  <td className={td}>{h.teacherCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PeriodsTab() {
  const [openPeriodId, setOpenPeriodId] = useState<string | null>(null);
  const periodsQuery = useQuery({ queryKey: ['admin-membership-periods'], queryFn: getMembershipPeriods });

  return (
    <>
      <div className="bg-primary-50 border border-primary-200 rounded-2xl px-4 py-3 text-xs text-primary-800 mb-4">
        Each month&apos;s membership money is split into the LMS share and a teacher pool, and the pool is shared by engagement score. Every calculation is
        saved as a frozen run. <strong>Finalizing</strong> locks the month for good - refunds that arrive later reduce the next open month instead.
      </div>

      <div className="bg-surface rounded-2xl shadow-soft overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              <th className={th}>Period</th>
              <th className={th}>Status</th>
              <th className={th}>Payments</th>
              <th className={th}>Gross</th>
              <th className={th}>Refunds</th>
              <th className={th}>Eligible</th>
              <th className={th}>LMS</th>
              <th className={th}>Teacher pool</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {periodsQuery.isLoading && (
              <tr>
                <td className={td} colSpan={9}>
                  Loading…
                </td>
              </tr>
            )}
            {periodsQuery.data?.length === 0 && (
              <tr>
                <td className={td} colSpan={9}>
                  No revenue periods yet. A period appears after the first membership payment of a month.
                </td>
              </tr>
            )}
            {periodsQuery.data?.map((p) => (
              <tr key={p.periodId} className="border-b border-border last:border-0">
                <td className={td}>
                  {p.periodStart} → {p.periodEnd}
                </td>
                <td className={td}>{p.status}</td>
                <td className={td}>{p.paymentCount}</td>
                <td className={td}>{formatMoney(p.grossRevenue)}</td>
                <td className={td}>{formatMoney(p.refundsAmount)}</td>
                <td className={td}>{p.latestCalculation ? formatMoney(p.latestCalculation.eligibleRevenue) : '—'}</td>
                <td className={td}>{p.latestCalculation ? formatMoney(p.latestCalculation.platformRevenue) : '—'}</td>
                <td className={td}>{p.latestCalculation ? formatMoney(p.latestCalculation.teacherPool) : '—'}</td>
                <td className={td}>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary-600 hover:underline"
                    onClick={() => setOpenPeriodId(openPeriodId === p.periodId ? null : p.periodId)}
                  >
                    {openPeriodId === p.periodId ? 'Close' : 'Open'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openPeriodId && <PeriodDetailPanel key={openPeriodId} periodId={openPeriodId} />}
    </>
  );
}

function TaxTab() {
  const queryClient = useQueryClient();
  const taxQuery = useQuery({ queryKey: ['admin-membership-tax'], queryFn: getMembershipTaxConfigs });

  const [month, setMonth] = useState('');
  const [rate, setRate] = useState('0');
  const [note, setNote] = useState('');

  const create = useMutation({
    mutationFn: () => createMembershipTaxConfig({ effectiveMonth: month, taxRate: rate, note: note || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-membership-tax'] });
      setNote('');
    },
  });

  return (
    <>
      <div className="bg-surface rounded-2xl shadow-soft overflow-x-auto mb-6">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              <th className={th}>Effective from</th>
              <th className={th}>Tax included in price</th>
              <th className={th}>Set by</th>
              <th className={th}>Note</th>
            </tr>
          </thead>
          <tbody>
            {taxQuery.data?.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0">
                <td className={td}>{formatDateTime(t.effectiveFrom)}</td>
                <td className={td}>{(t.taxRateBps / 100).toFixed(2)}%</td>
                <td className={td}>{t.createdByName ?? 'System'}</td>
                <td className={td}>{t.note ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-surface rounded-2xl shadow-soft p-5 max-w-2xl">
        <h2 className="text-lg font-bold text-text mb-1">Schedule a tax setting</h2>
        <p className="text-xs text-muted mb-4">
          The percentage of tax (for example GST) that is already inside the membership price. It is removed before the LMS / teacher split. Confirm the
          correct treatment with your accountant before launch. It applies to a whole month, from its 1st, and only future months can be scheduled.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-semibold text-muted">Effective month</span>
            <input className={input} type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted">Tax included (%)</span>
            <input className={input} type="number" min={0} max={100} step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
          </label>
        </div>
        <label className="block mt-4">
          <span className="text-xs font-semibold text-muted">Note (optional)</span>
          <input className={input} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="mt-4">
          <button type="button" className={primaryButton} disabled={!month || rate === '' || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? 'Saving…' : 'Schedule tax setting'}
          </button>
        </div>
        {create.isError && <p className="text-sm text-red-600 mt-3">{errorMessage(create.error)}</p>}
        {create.isSuccess && <p className="text-sm text-secondary-600 mt-3">Tax setting scheduled.</p>}
      </div>
    </>
  );
}

export default function AdminMembershipPeriods() {
  const [tab, setTab] = useState<'periods' | 'tax'>('periods');
  const tabs = [
    { id: 'periods' as const, label: 'Periods' },
    { id: 'tax' as const, label: 'Tax setting' },
  ];

  return (
    <DashboardLayout sidebarSections={adminSidebarSections}>
      <h1 className="text-3xl font-bold text-text mb-1">Revenue Periods</h1>
      <p className="text-muted mb-6">Calculate, review and finalize each month&apos;s membership revenue and teacher pool.</p>

      <div className="flex gap-2 mb-6">
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

      {tab === 'periods' && <PeriodsTab />}
      {tab === 'tax' && <TaxTab />}
    </DashboardLayout>
  );
}