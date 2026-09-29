import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '../components/DashboardLayout';
import { teacherSidebarSections } from '../config/teacherSidebar';
import { getTeacherOverview } from '../lib/api/teacherFinance';
import { formatMoney } from '../lib/financeFormat';

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'short' });
}

function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'positive' | 'negative';
}) {
  const toneClass = tone === 'positive' ? 'text-secondary-600' : tone === 'negative' ? 'text-danger-600' : 'text-text';
  return (
    <div className="bg-surface rounded-2xl shadow-soft p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</p>
      {hint && <p className="text-[11px] text-muted mt-1">{hint}</p>}
    </div>
  );
}

export default function TeacherEarnings() {
  const overviewQuery = useQuery({
    queryKey: ['teacher-finance-overview'],
    queryFn: getTeacherOverview,
  });

  const data = overviewQuery.data;
  // Bar heights only. Every displayed amount is the backend's exact string.
  const maxMonthly = Math.max(1, ...(data?.monthly.map((m) => Math.abs(Number(m.net))) ?? [0]));

  return (
    <DashboardLayout sidebarSections={teacherSidebarSections}>
      <h1 className="text-3xl font-bold text-text mb-1">Earnings</h1>
      <p className="text-muted mb-8">
        Your share of every sale after the platform split, minus refunds. These figures come from the financial ledger.
      </p>

      {overviewQuery.isLoading && <p className="text-sm text-muted">Loading earnings...</p>}
      {overviewQuery.isError && <p className="text-sm text-danger-600">Couldn't load earnings.</p>}

      {data && (
        <div className="space-y-6 max-w-5xl">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total earnings" value={formatMoney(data.totalEarnings)} hint="Course sales + membership, before refunds" />
            <StatCard label="Course sales earnings" value={formatMoney(data.courseSalesEarnings)} hint={`${data.sales} sale${data.sales === 1 ? '' : 's'}`} />
            <StatCard label="Membership earnings" value={formatMoney(data.membershipEarnings)} hint="Membership pool share" />
            <StatCard
              label="Refund adjustments"
              value={formatMoney(data.refundAdjustments)}
              tone="negative"
              hint={`${data.refundEvents} refund event${data.refundEvents === 1 ? '' : 's'}`}
            />
            <StatCard label="Pending payout" value={formatMoney(data.pendingPayout)} tone="positive" hint="Total earnings minus refunds" />
            <StatCard label="Paid amount" value={formatMoney(data.paidAmount)} hint="Payouts start in a later update" />
          </div>

          <div className="bg-surface rounded-2xl shadow-soft p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-text">Net earnings — last 6 months</p>
              <p className="text-xs text-muted">This month: {formatMoney(data.thisMonthNet)}</p>
            </div>
            <div className="flex items-end gap-3 h-44">
              {data.monthly.map((m) => {
                const value = Number(m.net);
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                    <span className="text-[11px] text-muted mb-1 truncate">{value !== 0 ? formatMoney(m.net) : ''}</span>
                    <div
                      className={[
                        'w-full max-w-12 rounded-t-lg',
                        value < 0 ? 'bg-danger-400' : 'bg-gradient-to-t from-primary-600 to-secondary-400',
                      ].join(' ')}
                      style={{ height: `${Math.max(2, (Math.abs(value) / maxMonthly) * 100)}%`, opacity: value !== 0 ? 1 : 0.25 }}
                      title={`${m.sales} sale${m.sales === 1 ? '' : 's'}`}
                    />
                    <span className="text-xs text-muted mt-2">{monthLabel(m.month)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/teacher/earnings/courses" className="bg-surface rounded-2xl shadow-soft p-5 hover:bg-surface-strong/60 transition">
              <p className="text-sm font-semibold text-text">Course sales</p>
              <p className="text-xs text-muted mt-1">See what each course earned, with LMS share and refunds.</p>
            </Link>
            <Link to="/teacher/earnings/statements" className="bg-surface rounded-2xl shadow-soft p-5 hover:bg-surface-strong/60 transition">
              <p className="text-sm font-semibold text-text">Statements</p>
              <p className="text-xs text-muted mt-1">Every earning, its percentage, and any refund adjustments.</p>
            </Link>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}