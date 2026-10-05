import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDateTime, formatMoney } from '../../lib/financeFormat';
import {
  getMembershipPeriodPayments,
  getMembershipRevenuePeriods,
} from '../../lib/api/membershipRevenue';

const th =
  'px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap text-left';

const td = 'px-4 py-3 text-sm text-text whitespace-nowrap';

export default function MembershipRevenuePanel() {
  const [openPeriodId, setOpenPeriodId] = useState<string | null>(null);

  const periodsQuery = useQuery({
    queryKey: ['admin-membership-revenue'],
    queryFn: getMembershipRevenuePeriods,
  });

  const paymentsQuery = useQuery({
    queryKey: ['admin-membership-revenue-payments', openPeriodId],
    queryFn: () => getMembershipPeriodPayments(openPeriodId as string),
    enabled: !!openPeriodId,
  });

  return (
    <>
      <div className="bg-primary-50 border border-primary-200 rounded-2xl px-4 py-3 text-xs text-primary-800 mb-4">
        Membership payments are pooled here per month. Figures marked{' '}
        <strong>projected</strong> use the current split rule and are not final.
        Once a period is finalized on the <strong>Revenue Periods</strong>{' '}
        page, this table shows the frozen LMS share and teacher pool.
      </div>

      <div className="bg-surface rounded-2xl shadow-soft overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              <th className={th}>Period</th>
              <th className={th}>Status</th>
              <th className={th}>Payments</th>
              <th className={th}>Gross collected</th>
              <th className={th}>LMS share</th>
              <th className={th}>Teacher pool</th>
              <th className={th}></th>
            </tr>
          </thead>

          <tbody>
            {periodsQuery.isLoading && (
              <tr>
                <td className={td} colSpan={7}>
                  Loading…
                </td>
              </tr>
            )}

            {periodsQuery.data?.length === 0 && (
              <tr>
                <td className={td} colSpan={7}>
                  No membership payments yet.
                </td>
              </tr>
            )}

            {periodsQuery.data?.map((period) => (
              <tr
                key={period.periodId}
                className="border-b border-border last:border-0"
              >
                <td className={td}>
                  {period.periodStart} → {period.periodEnd}
                </td>

                <td className={td}>{period.status}</td>

                <td className={td}>{period.payments}</td>

                <td className={td}>
                  {formatMoney(period.grossMembershipRevenue)}
                </td>

                {/* Updated LMS share cell */}
                <td className={td}>
                  {formatMoney(period.projectedPlatformShare)}{' '}
                  <span className="text-xs text-muted">
                    ({period.appliedRule.platformPercentage}%
                    {period.projectionOnly ? ', projected' : ''})
                  </span>
                </td>

                {/* Updated Teacher pool cell */}
                <td className={td}>
                  {formatMoney(period.projectedTeacherPool)}{' '}
                  <span className="text-xs text-muted">
                    ({period.appliedRule.teacherPercentage}%
                    {period.projectionOnly ? ', projected' : ''})
                  </span>
                </td>

                <td className={td}>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary-600 hover:underline"
                    onClick={() =>
                      setOpenPeriodId(
                        openPeriodId === period.periodId
                          ? null
                          : period.periodId
                      )
                    }
                  >
                    {openPeriodId === period.periodId
                      ? 'Hide payments'
                      : 'View payments'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openPeriodId && (
        <div className="bg-surface rounded-2xl shadow-soft overflow-x-auto mt-6">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className={th}>Paid at</th>
                <th className={th}>Student</th>
                <th className={th}>Plan</th>
                <th className={th}>Amount</th>
                <th className={th}>Access bought</th>
                <th className={th}>Subscription</th>
              </tr>
            </thead>

            <tbody>
              {paymentsQuery.isLoading && (
                <tr>
                  <td className={td} colSpan={6}>
                    Loading…
                  </td>
                </tr>
              )}

              {paymentsQuery.data?.map((row) => (
                <tr
                  key={row.transactionId}
                  className="border-b border-border last:border-0"
                >
                  <td className={td}>
                    {formatDateTime(row.occurredAt)}
                  </td>

                  <td className={td}>
                    <p>{row.studentName ?? '—'}</p>
                    <p className="text-xs text-muted">
                      {row.studentEmail}
                    </p>
                  </td>

                  <td className={td}>
                    {row.planName ?? '—'}
                  </td>

                  <td className={td}>
                    {formatMoney(row.amount)}
                  </td>

                  <td className={td}>
                    {row.paidFrom && row.paidUntil
                      ? `${formatDateTime(row.paidFrom)} → ${formatDateTime(
                          row.paidUntil
                        )}`
                      : '—'}
                  </td>

                  <td className={td}>
                    {row.subscriptionStatus ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

