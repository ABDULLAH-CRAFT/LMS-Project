import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '../components/DashboardLayout';
import RangeFilter from '../components/finance/RangeFilter';
import { adminSidebarSections } from '../config/adminSidebar';
import { useFinanceRange } from '../hooks/useFinanceRange';
import { getRevenueOverview, getTeacherRevenue } from '../lib/api/finance';
import { formatMoney } from '../lib/financeFormat';

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

const th = 'px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap';
const td = 'px-4 py-3 text-sm text-text whitespace-nowrap';

export default function AdminRevenue() {
  const range = useFinanceRange('30d');

  const overviewQuery = useQuery({
    queryKey: ['admin-finance-overview', range.params],
    queryFn: () => getRevenueOverview(range.params),
    enabled: range.enabled,
  });

  const teachersQuery = useQuery({
    queryKey: ['admin-finance-teachers', range.params],
    queryFn: () => getTeacherRevenue(range.params),
    enabled: range.enabled,
  });

  const overview = overviewQuery.data;
  const teachers = teachersQuery.data;
  const resolved = overview?.range ?? teachers?.range;

  return (
    <DashboardLayout sidebarSections={adminSidebarSections}>
      <h1 className="text-3xl font-bold text-text mb-1">Revenue Overview</h1>
      <p className="text-muted mb-6">Course sales, refunds and how each rupee is split between the LMS and teachers.</p>

      <RangeFilter
        preset={range.preset}
        from={range.from}
        to={range.to}
        onPresetChange={range.setPreset}
        onFromChange={range.setFrom}
        onToChange={range.setTo}
        resolvedLabel={resolved ? `Showing ${resolved.from} to ${resolved.to} (IST)` : undefined}
      />

      {overviewQuery.isError && <p className="text-sm text-danger-600 mb-4">Couldn't load the revenue overview.</p>}
      {overviewQuery.isLoading && <p className="text-sm text-muted mb-4">Loading overview...</p>}

      {overview && (
        <div className="max-w-6xl mb-8">
          {!overview.reconciled && (
            <div className="bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-2xl px-4 py-3 mb-4">
              LMS share + teacher share does not equal eligible revenue for this range. Check the ledger before trusting these numbers.
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Gross course sales" value={formatMoney(overview.grossSales)} hint={`${overview.itemsSold} course${overview.itemsSold === 1 ? '' : 's'} sold`} />
            <StatCard label="Refunds" value={formatMoney(overview.refunds)} tone="negative" hint={`${overview.refundEvents} refund event${overview.refundEvents === 1 ? '' : 's'}`} />
            <StatCard label="Eligible revenue" value={formatMoney(overview.eligibleRevenue)} hint="Gross minus refunds" />
            <StatCard label="LMS revenue" value={formatMoney(overview.lmsRevenue)} tone="positive" hint="Net of refunds" />
            <StatCard label="Teacher revenue" value={formatMoney(overview.teacherRevenue)} tone="positive" hint="Net of refunds" />
            <StatCard label="Transactions" value={String(overview.orders)} hint="Paid orders in range" />
            <StatCard label="Average order value" value={formatMoney(overview.averageOrderValue)} />
          </div>
        </div>
      )}

      <div className="max-w-6xl">
        <h2 className="font-semibold text-text mb-3">Teacher revenue</h2>

        {teachersQuery.isError && <p className="text-sm text-danger-600">Couldn't load teacher revenue.</p>}
        {teachersQuery.isLoading && <p className="text-sm text-muted">Loading teacher revenue...</p>}

        {teachers && (
          <div className="bg-surface rounded-2xl shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-strong/60">
                  <tr>
                    <th className={th}>Teacher</th>
                    <th className={`${th} text-right`}>Courses</th>
                    <th className={`${th} text-right`}>Sales</th>
                    <th className={`${th} text-right`}>Gross revenue</th>
                    <th className={`${th} text-right`}>LMS share</th>
                    <th className={`${th} text-right`}>Teacher share</th>
                    <th className={`${th} text-right`}>Refunds</th>
                    <th className={`${th} text-right`}>Net earnings</th>
                    <th className={`${th} text-right`}>Pending payout</th>
                    <th className={`${th} text-right`}>Paid out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {teachers.teachers.map((t) => (
                    <tr key={t.teacherId}>
                      <td className={td}>
                        <p className="font-medium">{t.name}</p>
                        <p className="text-xs text-muted">{t.email}</p>
                      </td>
                      <td className={`${td} text-right`}>{t.courses}</td>
                      <td className={`${td} text-right`}>{t.sales}</td>
                      <td className={`${td} text-right`}>{formatMoney(t.grossRevenue)}</td>
                      <td className={`${td} text-right`}>{formatMoney(t.lmsShare)}</td>
                      <td className={`${td} text-right`}>{formatMoney(t.teacherShare)}</td>
                      <td className={`${td} text-right text-danger-600`}>{formatMoney(t.refunds)}</td>
                      <td className={`${td} text-right font-semibold text-secondary-600`}>{formatMoney(t.netEarnings)}</td>
                      <td className={`${td} text-right`}>{formatMoney(t.pendingPayout)}</td>
                      <td className={`${td} text-right`}>{formatMoney(t.paidOut)}</td>
                    </tr>
                  ))}
                  {teachers.teachers.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-sm text-muted">
                        No teachers yet.
                      </td>
                    </tr>
                  )}
                </tbody>
                {teachers.teachers.length > 0 && (
                  <tfoot className="bg-surface-strong/60">
                    <tr>
                      <td className={`${td} font-semibold`}>Total</td>
                      <td className={td} />
                      <td className={`${td} text-right font-semibold`}>{teachers.totals.sales}</td>
                      <td className={`${td} text-right font-semibold`}>{formatMoney(teachers.totals.grossRevenue)}</td>
                      <td className={`${td} text-right font-semibold`}>{formatMoney(teachers.totals.lmsShare)}</td>
                      <td className={`${td} text-right font-semibold`}>{formatMoney(teachers.totals.teacherShare)}</td>
                      <td className={`${td} text-right font-semibold text-danger-600`}>{formatMoney(teachers.totals.refunds)}</td>
                      <td className={`${td} text-right font-semibold text-secondary-600`}>{formatMoney(teachers.totals.netEarnings)}</td>
                      <td className={`${td} text-right font-semibold`}>{formatMoney(teachers.totals.pendingPayout)}</td>
                      <td className={`${td} text-right font-semibold`}>{formatMoney(teachers.totals.paidOut)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
        <p className="text-xs text-muted mt-3">
          LMS share and teacher share are before refunds. Net earnings = teacher share − refunds. Payouts arrive in a later phase, so
          "Pending payout" currently equals net earnings and "Paid out" is zero.
        </p>
      </div>
    </DashboardLayout>
  );
}