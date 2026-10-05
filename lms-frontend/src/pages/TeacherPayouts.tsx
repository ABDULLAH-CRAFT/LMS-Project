import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import PayoutDetailModal from '../components/finance/PayoutDetailModal';
import PayoutStatusBadge from '../components/finance/PayoutStatusBadge';
import { teacherSidebarSections } from '../config/teacherSidebar';
import { getTeacherBalance, listTeacherPayouts, requestTeacherPayout } from '../lib/api/payouts';
import { formatDateTime, formatMoney } from '../lib/financeFormat';

const PAGE_SIZE = 10;
const th = 'px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap text-left';
const td = 'px-4 py-3 text-sm text-text whitespace-nowrap';

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message ?? error.message;
  }
  return 'Something went wrong';
}

function StatCard({ label, value, hint, tone = 'default' }: { label: string; value: string; hint?: string; tone?: 'default' | 'positive' }) {
  return (
    <div className="bg-surface rounded-2xl shadow-soft p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${tone === 'positive' ? 'text-secondary-600' : 'text-text'}`}>{value}</p>
      {hint && <p className="text-[11px] text-muted mt-1">{hint}</p>}
    </div>
  );
}

export default function TeacherPayouts() {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  const balanceQuery = useQuery({ queryKey: ['teacher-payout-balance'], queryFn: getTeacherBalance });
  const listQuery = useQuery({
    queryKey: ['teacher-payouts', offset],
    queryFn: () => listTeacherPayouts(PAGE_SIZE, offset),
    placeholderData: keepPreviousData,
  });

  const request = useMutation({
    mutationFn: requestTeacherPayout,
    onSuccess: () => {
      setOffset(0);
      queryClient.invalidateQueries({ queryKey: ['teacher-payout-balance'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-finance-overview'] });
    },
  });

  const b = balanceQuery.data;
  const list = listQuery.data;
  const total = list?.paging.total ?? 0;

  const onRequest = () => {
    if (!b) return;
    const ok = window.confirm(`Request a payout of ${formatMoney(b.balances.availableBalance)}?\n\nThe amount is your whole available balance.`);
    if (ok) request.mutate();
  };

  return (
    <DashboardLayout sidebarSections={teacherSidebarSections}>
      <h1 className="text-3xl font-bold text-text mb-1">Payouts</h1>
      <p className="text-muted mb-8">
        Earning money and being paid are two steps. New course earnings are held for {b?.settings.holdDays ?? 7} days (the refund
        window). Finalized membership earnings are available straight away. You request a payout, an admin approves it, and
        then it is sent.
      </p>

      {balanceQuery.isLoading && <p className="text-sm text-muted">Loading balances...</p>}
      {balanceQuery.isError && <p className="text-sm text-danger-600">Couldn't load your balances.</p>}

      {b && (
        <div className="space-y-6 max-w-5xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Pending (on hold)"
              value={formatMoney(b.balances.pendingEarnings)}
              hint={b.nextReleaseAt ? `Next release ${formatDateTime(b.nextReleaseAt)}` : 'Nothing on hold'}
            />
            <StatCard label="Available now" value={formatMoney(b.balances.availableBalance)} tone="positive" hint={`Minimum payout ${formatMoney(b.settings.minimumPayout)}`} />
            <StatCard label="In payout" value={formatMoney(b.balances.processingBalance)} hint="Requested, approved or processing" />
            <StatCard label="Paid to you" value={formatMoney(b.balances.paidBalance)} />
          </div>

          <div className="bg-surface rounded-2xl shadow-soft p-5 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-semibold text-text">Request a payout</p>
              <p className="text-xs text-muted mt-1">
                {b.canRequest
                  ? `You can request ${formatMoney(b.balances.availableBalance)}.`
                  : b.cannotRequestReason}
              </p>
              {Number(b.balances.adjustmentBalance) < 0 && (
                <p className="text-[11px] text-muted mt-1">Refund adjustments of {formatMoney(b.balances.adjustmentBalance)} are already included in these balances.</p>
              )}
              {request.isError && <p className="text-xs text-danger-600 mt-1">{errorMessage(request.error)}</p>}
            </div>
            <button
              onClick={onRequest}
              disabled={!b.canRequest || request.isPending}
              className="bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-5 py-2 rounded-full text-sm font-semibold disabled:opacity-40"
            >
              {request.isPending ? 'Requesting...' : 'Request payout'}
            </button>
          </div>

          <div className="bg-surface rounded-2xl shadow-soft overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-text">Payout history</p>
            </div>
            {listQuery.isError && <p className="text-sm text-danger-600 p-4">Couldn't load payouts.</p>}
            {list && list.payouts.length === 0 && <p className="text-sm text-muted p-4">No payouts yet.</p>}
            {list && list.payouts.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-strong/60">
                    <tr>
                      <th className={th}>Requested</th>
                      <th className={`${th} text-right`}>Amount</th>
                      <th className={th}>Status</th>
                      <th className={th}>Paid on</th>
                      <th className={th}>Bank reference</th>
                      <th className={th}></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {list.payouts.map((p) => (
                      <tr key={p.id}>
                        <td className={td}>{formatDateTime(p.requestedAt)}</td>
                        <td className={`${td} text-right font-semibold`}>{formatMoney(p.amount)}</td>
                        <td className={td}>
                          <PayoutStatusBadge status={p.status} />
                          {(p.failureReason || p.rejectionReason) && (
                            <span className="block text-[11px] text-muted mt-1 whitespace-normal max-w-xs">{p.failureReason ?? p.rejectionReason}</span>
                          )}
                        </td>
                        <td className={td}>{p.paidAt ? formatDateTime(p.paidAt) : '—'}</td>
                        <td className={`${td} font-mono text-xs`}>{p.providerPayoutId ?? '—'}</td>
                        <td className={td}>
                          <button onClick={() => setOpenId(p.id)} className="text-xs text-primary-600 font-medium">Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted">
                <span>{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}</span>
                <div className="flex gap-2">
                  <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} className="px-3 py-1 rounded-full border border-border disabled:opacity-40">Previous</button>
                  <button disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)} className="px-3 py-1 rounded-full border border-border disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {openId && <PayoutDetailModal payoutId={openId} scope="teacher" onClose={() => setOpenId(null)} />}
    </DashboardLayout>
  );
}