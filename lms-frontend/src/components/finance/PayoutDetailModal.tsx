import { useQuery } from '@tanstack/react-query';
import { getAdminPayout, getTeacherPayout } from '../../lib/api/payouts';
import { formatDateTime, formatMoney } from '../../lib/financeFormat';
import PayoutStatusBadge, { payoutStatusLabel } from './PayoutStatusBadge';

const th = 'px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap text-left';
const td = 'px-3 py-2 text-sm text-text';

interface PayoutDetailModalProps {
  payoutId: string;
  scope: 'admin' | 'teacher';
  onClose: () => void;
}

// Read-only. Shows the exact ledger lines a payout settles, so every rupee can be traced.
export default function PayoutDetailModal({ payoutId, scope, onClose }: PayoutDetailModalProps) {
  const query = useQuery({
    queryKey: ['payout-detail', scope, payoutId],
    queryFn: () => (scope === 'admin' ? getAdminPayout(payoutId) : getTeacherPayout(payoutId)),
  });
  const p = query.data;

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-2xl shadow-soft max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-text">Payout detail</h2>
            {p && <p className="text-xs text-muted font-mono mt-1">{p.id}</p>}
          </div>
          <button onClick={onClose} className="text-muted hover:text-text text-sm">Close</button>
        </div>

        {query.isLoading && <p className="text-sm text-muted">Loading payout...</p>}
        {query.isError && <p className="text-sm text-danger-600">Couldn't load this payout.</p>}

        {p && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-muted">Amount</p>
                <p className="text-lg font-bold text-text">{formatMoney(p.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Status</p>
                <div className="mt-1"><PayoutStatusBadge status={p.status} /></div>
              </div>
              <div>
                <p className="text-xs text-muted">Requested</p>
                <p className="text-sm text-text">{formatDateTime(p.requestedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Bank reference</p>
                <p className="text-sm text-text font-mono">{p.providerPayoutId ?? '—'}</p>
              </div>
            </div>

            {scope === 'admin' && p.teacher && (
              <p className="text-sm text-text">
                Teacher: <span className="font-medium">{p.teacher.name}</span> <span className="text-muted">({p.teacher.email})</span>
                {p.approvedByName ? <span className="text-muted"> · approved by {p.approvedByName}</span> : null}
              </p>
            )}

            {p.failureReason && <p className="text-xs rounded-xl bg-danger-50 text-danger-700 px-3 py-2">Failure: {p.failureReason}</p>}
            {p.rejectionReason && <p className="text-xs rounded-xl bg-surface-strong text-muted-dark px-3 py-2">Rejected: {p.rejectionReason}</p>}
            {p.reversalReason && <p className="text-xs rounded-xl bg-danger-50 text-danger-700 px-3 py-2">Reversed: {p.reversalReason}</p>}

            <div>
              <p className="text-sm font-semibold text-text mb-2">What this payout settles ({p.itemCount} line{p.itemCount === 1 ? '' : 's'})</p>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full">
                  <thead className="bg-surface-strong/60">
                    <tr>
                      <th className={th}>Date</th>
                      <th className={th}>Line</th>
                      <th className={th}>Ref</th>
                      <th className={`${th} text-right`}>Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {p.items.map((i) => (
                      <tr key={i.id} className={i.released ? 'opacity-50' : ''}>
                        <td className={`${td} whitespace-nowrap`}>{i.occurredAt ? formatDateTime(i.occurredAt) : '—'}</td>
                        <td className={td}>{i.description}{i.released ? ' (released)' : ''}</td>
                        <td className={`${td} font-mono text-xs`}>{i.reference ?? '—'}</td>
                        <td className={`${td} text-right ${Number(i.amount) < 0 ? 'text-danger-600' : ''}`}>{formatMoney(i.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {p.items.length < p.itemCount && <p className="text-xs text-muted mt-1">Showing the first {p.items.length} lines.</p>}
            </div>

            <div>
              <p className="text-sm font-semibold text-text mb-2">History</p>
              <ul className="space-y-1">
                {p.events.map((e, index) => (
                  <li key={index} className="text-xs text-muted-dark flex flex-wrap gap-x-2">
                    <span className="font-medium">{payoutStatusLabel(e.toStatus)}</span>
                    <span>{formatDateTime(e.createdAt)}</span>
                    {scope === 'admin' && e.actorName ? <span>by {e.actorName}</span> : null}
                    {scope === 'admin' && e.note ? <span className="text-muted">— {e.note}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}