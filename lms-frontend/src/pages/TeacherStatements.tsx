import { Fragment, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import DashboardLayout from '../components/DashboardLayout';
import TeacherRangeFilter from '../components/finance/TeacherRangeFilter';
import { teacherSidebarSections } from '../config/teacherSidebar';
import { useTeacherFinanceRange } from '../hooks/useTeacherFinanceRange';
import { getTeacherStatement } from '../lib/api/teacherFinance';
import { formatDateTime, formatMoney } from '../lib/financeFormat';
import type { StatementStatus, TeacherRangePreset } from '../types/teacherFinance';

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<StatementStatus, string> = {
  EARNED: 'Earned',
  PARTIALLY_REFUNDED: 'Partly refunded',
  REFUNDED: 'Refunded',
};

const STATUS_STYLE: Record<StatementStatus, string> = {
  EARNED: 'bg-secondary-100 text-secondary-700',
  PARTIALLY_REFUNDED: 'bg-tertiary-100 text-tertiary-700',
  REFUNDED: 'bg-danger-100 text-danger-700',
};

const PAYOUT_LABEL: Record<string, string> = {
  UNPAID: 'Not paid yet',
  REQUESTED: 'Payout requested',
  PROCESSING: 'Processing',
  PAID: 'Paid',
};

const th = 'px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap';
const td = 'px-4 py-3 text-sm text-text whitespace-nowrap';

export default function TeacherStatements() {
  const range = useTeacherFinanceRange('30d');
  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const statementQuery = useQuery({
    queryKey: ['teacher-finance-statement', range.params, offset],
    queryFn: () => getTeacherStatement(range.params, { limit: PAGE_SIZE, offset }),
    enabled: range.enabled,
    placeholderData: keepPreviousData,
  });

  const data = statementQuery.data;
  const total = data?.paging.total ?? 0;
  const shownFrom = total === 0 ? 0 : offset + 1;
  const shownTo = Math.min(offset + PAGE_SIZE, total);

  const changePreset = (preset: TeacherRangePreset) => {
    range.setPreset(preset);
    setOffset(0);
    setExpandedId(null);
  };
  const changeFrom = (value: string) => {
    range.setFrom(value);
    setOffset(0);
    setExpandedId(null);
  };
  const changeTo = (value: string) => {
    range.setTo(value);
    setOffset(0);
    setExpandedId(null);
  };

  const resolvedLabel = data
    ? data.range.from && data.range.to
      ? `Showing ${data.range.from} to ${data.range.to} (IST)`
      : 'Showing all time'
    : undefined;

  return (
    <DashboardLayout sidebarSections={teacherSidebarSections}>
      <h1 className="text-3xl font-bold text-text mb-1">Statements</h1>
      <p className="text-muted mb-6">Each sale that earned you money, your percentage, and any refund adjustments. Click a row to see refunds.</p>

      <TeacherRangeFilter
        preset={range.preset}
        from={range.from}
        to={range.to}
        onPresetChange={changePreset}
        onFromChange={changeFrom}
        onToChange={changeTo}
        resolvedLabel={resolvedLabel}
      />

      {statementQuery.isLoading && <p className="text-sm text-muted">Loading statement...</p>}
      {statementQuery.isError && <p className="text-sm text-danger-600">Couldn't load your statement.</p>}

      {data && (
        <div className="max-w-6xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface rounded-2xl shadow-soft p-4">
              <p className="text-xs text-muted">Gross amount</p>
              <p className="text-xl font-bold text-text mt-1">{formatMoney(data.totals.grossAmount)}</p>
              <p className="text-[11px] text-muted mt-1">{data.totals.entries} sale{data.totals.entries === 1 ? '' : 's'}</p>
            </div>
            <div className="bg-surface rounded-2xl shadow-soft p-4">
              <p className="text-xs text-muted">Your earnings</p>
              <p className="text-xl font-bold text-text mt-1">{formatMoney(data.totals.teacherEarning)}</p>
            </div>
            <div className="bg-surface rounded-2xl shadow-soft p-4">
              <p className="text-xs text-muted">Adjustments</p>
              <p className="text-xl font-bold text-danger-600 mt-1">{formatMoney(data.totals.adjustments)}</p>
            </div>
            <div className="bg-surface rounded-2xl shadow-soft p-4">
              <p className="text-xs text-muted">Net earnings</p>
              <p className="text-xl font-bold text-secondary-600 mt-1">{formatMoney(data.totals.netEarning)}</p>
            </div>
          </div>

          <div className="bg-surface rounded-2xl shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-strong/60">
                  <tr>
                    <th className={th}>Date</th>
                    <th className={th}>Transaction</th>
                    <th className={th}>Course</th>
                    <th className={th}>Learner</th>
                    <th className={`${th} text-right`}>Gross</th>
                    <th className={`${th} text-right`}>Your %</th>
                    <th className={`${th} text-right`}>Earning</th>
                    <th className={`${th} text-right`}>Adjustments</th>
                    <th className={`${th} text-right`}>Net</th>
                    <th className={th}>Status</th>
                    <th className={th}>Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.entries.map((e) => {
                    const open = expandedId === e.allocationId;
                    return (
                      <Fragment key={e.allocationId}>
                        <tr
                          tabIndex={0}
                          onClick={() => setExpandedId(open ? null : e.allocationId)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') setExpandedId(open ? null : e.allocationId);
                          }}
                          className="cursor-pointer hover:bg-surface-strong/60 transition"
                        >
                          <td className={td}>{formatDateTime(e.occurredAt)}</td>
                          <td className={`${td} text-xs font-mono`}>{e.reference}</td>
                          <td className={`${td} font-medium`}>{e.courseTitle}</td>
                          <td className={`${td} text-xs font-mono`}>{e.learnerRef}</td>
                          <td className={`${td} text-right`}>{formatMoney(e.grossAmount)}</td>
                          <td className={`${td} text-right`}>{e.teacherPercentage}%</td>
                          <td className={`${td} text-right`}>{formatMoney(e.teacherEarning)}</td>
                          <td className={`${td} text-right text-danger-600`}>{formatMoney(e.adjustments)}</td>
                          <td className={`${td} text-right font-semibold text-secondary-600`}>{formatMoney(e.netEarning)}</td>
                          <td className={td}>
                            <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[e.status]}`}>
                              {STATUS_LABEL[e.status]}
                            </span>
                          </td>
                          <td className={`${td} text-xs text-muted`}>{PAYOUT_LABEL[e.payoutStatus]}</td>
                        </tr>
                        {open && (
                          <tr>
                            <td colSpan={11} className="px-4 py-3 bg-surface-strong/40">
                              {e.refunds.length === 0 ? (
                                <p className="text-xs text-muted">No refunds on this sale.</p>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-muted-dark">
                                    Original earning {formatMoney(e.teacherEarning)} → refund adjustments → current {formatMoney(e.netEarning)}
                                  </p>
                                  {e.refunds.map((r) => (
                                    <div key={r.reference} className="flex items-center justify-between text-xs text-muted-dark max-w-md">
                                      <span>
                                        {r.type} · {formatDateTime(r.occurredAt)} · <span className="font-mono">{r.reference}</span>
                                      </span>
                                      <span className="font-medium text-danger-600">{formatMoney(r.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {data.entries.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-sm text-muted">
                        No earnings in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted">{total === 0 ? 'No results' : `Showing ${shownFrom}–${shownTo} of ${total}`}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-surface-strong text-text disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={offset + PAGE_SIZE >= total}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-surface-strong text-text disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted mt-3">
            Rows are the sales made in the selected period, with refunds shown even if they happened later. The Course Sales page counts a
            refund in the period it was issued, so the two pages can differ for ranges that split a sale and its refund. Learner codes
            hide student identities and are only meaningful within your own account.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}