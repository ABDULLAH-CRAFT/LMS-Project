import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import RangeFilter from '../components/finance/RangeFilter';
import TransactionDetailModal from '../components/finance/TransactionDetailModal';
import { adminSidebarSections } from '../config/adminSidebar';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useFinanceRange } from '../hooks/useFinanceRange';
import { getCourseRevenue, getTransactions } from '../lib/api/finance';
import { formatDateTime, formatMoney } from '../lib/financeFormat';
import type { RangePreset, TransactionStatus } from '../types/finance';

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<TransactionStatus, string> = {
  PAID: 'Paid',
  PARTIALLY_REFUNDED: 'Partly refunded',
  REFUNDED: 'Refunded',
};

const STATUS_STYLE: Record<TransactionStatus, string> = {
  PAID: 'bg-secondary-100 text-secondary-700',
  PARTIALLY_REFUNDED: 'bg-tertiary-100 text-tertiary-700',
  REFUNDED: 'bg-danger-100 text-danger-700',
};

const th = 'px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap';
const td = 'px-4 py-3 text-sm text-text whitespace-nowrap';

export default function AdminCourseSales() {
  const range = useFinanceRange('30d');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 400);

  const coursesQuery = useQuery({
    queryKey: ['admin-finance-courses', range.params],
    queryFn: () => getCourseRevenue(range.params),
    enabled: range.enabled,
  });

  const transactionsQuery = useQuery({
    queryKey: ['admin-finance-transactions', range.params, debouncedSearch, offset],
    queryFn: () => getTransactions(range.params, { limit: PAGE_SIZE, offset, search: debouncedSearch }),
    enabled: range.enabled,
    placeholderData: keepPreviousData,
  });

  const courses = coursesQuery.data;
  const transactions = transactionsQuery.data;
  const total = transactions?.paging.total ?? 0;
  const shownFrom = total === 0 ? 0 : offset + 1;
  const shownTo = Math.min(offset + PAGE_SIZE, total);
  const resolved = courses?.range ?? transactions?.range;

  const changePreset = (preset: RangePreset) => {
    range.setPreset(preset);
    setOffset(0);
  };
  const changeFrom = (value: string) => {
    range.setFrom(value);
    setOffset(0);
  };
  const changeTo = (value: string) => {
    range.setTo(value);
    setOffset(0);
  };

  return (
    <DashboardLayout sidebarSections={adminSidebarSections}>
      <h1 className="text-3xl font-bold text-text mb-1">Course Sales</h1>
      <p className="text-muted mb-6">Revenue per course, and every payment behind it. Click a payment to see exactly how it was split.</p>

      <RangeFilter
        preset={range.preset}
        from={range.from}
        to={range.to}
        onPresetChange={changePreset}
        onFromChange={changeFrom}
        onToChange={changeTo}
        resolvedLabel={resolved ? `Showing ${resolved.from} to ${resolved.to} (IST)` : undefined}
      />

      {/* Course revenue */}
      <div className="max-w-6xl mb-10">
        <h2 className="font-semibold text-text mb-3">Course revenue</h2>
        {coursesQuery.isError && <p className="text-sm text-danger-600">Couldn't load course revenue.</p>}
        {coursesQuery.isLoading && <p className="text-sm text-muted">Loading course revenue...</p>}

        {courses && (
          <div className="bg-surface rounded-2xl shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-strong/60">
                  <tr>
                    <th className={th}>Course</th>
                    <th className={th}>Teacher</th>
                    <th className={`${th} text-right`}>Orders</th>
                    <th className={`${th} text-right`}>Gross sales</th>
                    <th className={`${th} text-right`}>Refunds</th>
                    <th className={`${th} text-right`}>LMS revenue (net)</th>
                    <th className={`${th} text-right`}>Teacher revenue (net)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {courses.courses.map((c) => (
                    <tr key={c.courseId}>
                      <td className={`${td} font-medium`}>{c.title}</td>
                      <td className={td}>{c.teacherName}</td>
                      <td className={`${td} text-right`}>{c.orders}</td>
                      <td className={`${td} text-right`}>{formatMoney(c.grossSales)}</td>
                      <td className={`${td} text-right text-danger-600`}>{formatMoney(c.refunds)}</td>
                      <td className={`${td} text-right`}>{formatMoney(c.lmsRevenue)}</td>
                      <td className={`${td} text-right font-semibold text-secondary-600`}>{formatMoney(c.teacherRevenue)}</td>
                    </tr>
                  ))}
                  {courses.courses.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted">
                        No course activity in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
                {courses.courses.length > 0 && (
                  <tfoot className="bg-surface-strong/60">
                    <tr>
                      <td className={`${td} font-semibold`}>Total</td>
                      <td className={td} />
                      <td className={`${td} text-right font-semibold`}>{courses.totals.orders}</td>
                      <td className={`${td} text-right font-semibold`}>{formatMoney(courses.totals.grossSales)}</td>
                      <td className={`${td} text-right font-semibold text-danger-600`}>{formatMoney(courses.totals.refunds)}</td>
                      <td className={`${td} text-right font-semibold`}>{formatMoney(courses.totals.lmsRevenue)}</td>
                      <td className={`${td} text-right font-semibold text-secondary-600`}>{formatMoney(courses.totals.teacherRevenue)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="max-w-6xl">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold text-text">Transactions</h2>
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student, email or payment id..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
              className="w-full bg-surface-strong border border-border rounded-full pl-8 pr-3 py-1.5 text-xs text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition"
            />
          </div>
        </div>

        {transactionsQuery.isError && <p className="text-sm text-danger-600">Couldn't load transactions.</p>}
        {transactionsQuery.isLoading && <p className="text-sm text-muted">Loading transactions...</p>}

        {transactions && (
          <div className="bg-surface rounded-2xl shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-strong/60">
                  <tr>
                    <th className={th}>Date</th>
                    <th className={th}>Student</th>
                    <th className={th}>Payment ref</th>
                    <th className={`${th} text-right`}>Items</th>
                    <th className={`${th} text-right`}>Gross</th>
                    <th className={`${th} text-right`}>Refunded</th>
                    <th className={`${th} text-right`}>Net</th>
                    <th className={`${th} text-right`}>LMS</th>
                    <th className={`${th} text-right`}>Teachers</th>
                    <th className={th}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.transactions.map((t) => (
                    <tr
                      key={t.paymentId}
                      tabIndex={0}
                      onClick={() => setSelectedPaymentId(t.paymentId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setSelectedPaymentId(t.paymentId);
                      }}
                      className="cursor-pointer hover:bg-surface-strong/60 transition"
                    >
                      <td className={td}>{formatDateTime(t.paidAt)}</td>
                      <td className={td}>
                        <p className="font-medium">{t.studentName}</p>
                        <p className="text-xs text-muted">{t.studentEmail}</p>
                      </td>
                      <td className={`${td} text-xs`}>{t.providerPaymentId ?? t.providerOrderId}</td>
                      <td className={`${td} text-right`}>{t.items}</td>
                      <td className={`${td} text-right`}>{formatMoney(t.gross)}</td>
                      <td className={`${td} text-right text-danger-600`}>{formatMoney(t.refunded)}</td>
                      <td className={`${td} text-right font-semibold`}>{formatMoney(t.net)}</td>
                      <td className={`${td} text-right`}>{formatMoney(t.lmsNet)}</td>
                      <td className={`${td} text-right`}>{formatMoney(t.teacherNet)}</td>
                      <td className={td}>
                        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[t.status]}`}>
                          {STATUS_LABEL[t.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {transactions.transactions.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-sm text-muted">
                        No transactions match this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted">
                {total === 0 ? 'No results' : `Showing ${shownFrom}–${shownTo} of ${total}`}
              </p>
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
        )}
      </div>

      <TransactionDetailModal paymentId={selectedPaymentId} onClose={() => setSelectedPaymentId(null)} />
    </DashboardLayout>
  );
}