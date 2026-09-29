import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { getTransactionDetail } from '../../lib/api/finance';
import { formatDateTime, formatMoney } from '../../lib/financeFormat';
import type { AllocationView, TransactionItemDetail } from '../../types/finance';

interface TransactionDetailModalProps {
  paymentId: string | null; // null = closed
  onClose: () => void;
}

function AllocationRows({ allocations }: { allocations: AllocationView[] }) {
  return (
    <div className="mt-2 space-y-1">
      {allocations.map((a) => (
        <div
          key={`${a.recipientType}-${a.recipientId ?? 'platform'}`}
          className="flex items-center justify-between text-xs text-muted-dark"
        >
          <span>
            {a.recipientName} <span className="text-muted">({a.percentage}%)</span>
          </span>
          <span className="font-medium">{formatMoney(a.amount)}</span>
        </div>
      ))}
    </div>
  );
}

function ItemCard({ item }: { item: TransactionItemDetail }) {
  const teacherName = item.original.allocations.find((a) => a.recipientType === 'TEACHER')?.recipientName ?? 'Unknown teacher';

  return (
    <div className="bg-surface-strong/60 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text truncate">{item.courseTitle ?? 'Deleted course'}</p>
          <p className="text-xs text-muted">Teacher: {teacherName}</p>
        </div>
        <p className="text-sm font-bold text-text shrink-0">Final net {formatMoney(item.finalNet)}</p>
      </div>

      <div className="space-y-3">
        <div className="bg-surface rounded-xl p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-secondary-600 uppercase tracking-wide">Original purchase</p>
            <p className="text-sm font-semibold text-text">{formatMoney(item.original.amount)}</p>
          </div>
          <p className="text-[11px] text-muted">{formatDateTime(item.original.occurredAt)}</p>
          <AllocationRows allocations={item.original.allocations} />
        </div>

        {item.reversals.map((reversal) => (
          <div key={reversal.transactionId} className="bg-danger-50 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-danger-600 uppercase tracking-wide">{reversal.type}</p>
              <p className="text-sm font-semibold text-danger-600">{formatMoney(reversal.amount)}</p>
            </div>
            <p className="text-[11px] text-muted">{formatDateTime(reversal.occurredAt)}</p>
            {reversal.refund && (
              <div className="text-[11px] text-muted-dark mt-1 space-y-0.5">
                <p>
                  Source: {reversal.refund.source}
                  {reversal.refund.initiatedByName ? ` · by ${reversal.refund.initiatedByName}` : ''}
                </p>
                {reversal.refund.reason && <p>Reason: {reversal.refund.reason}</p>}
                <p>Provider ref: {reversal.refund.providerRefundId}</p>
                {reversal.refund.accessRevoked && <p className="font-medium">Course access was revoked.</p>}
              </div>
            )}
            <p className="text-[11px] text-muted mt-2">Revenue reversal</p>
            <AllocationRows allocations={reversal.allocations} />
          </div>
        ))}

        <div className="bg-surface rounded-xl p-3 border border-border">
          <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide">Final net</p>
          <div className="mt-2 space-y-1">
            {item.netByRecipient.map((n) => (
              <div
                key={`${n.recipientType}-${n.recipientId ?? 'platform'}`}
                className="flex items-center justify-between text-xs text-muted-dark"
              >
                <span>{n.recipientName}</span>
                <span className="font-medium">{formatMoney(n.net)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TransactionDetailModal({ paymentId, onClose }: TransactionDetailModalProps) {
  const detailQuery = useQuery({
    queryKey: ['admin-finance-transaction', paymentId],
    queryFn: () => getTransactionDetail(paymentId as string),
    enabled: paymentId !== null,
  });

  useEffect(() => {
    if (paymentId === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paymentId, onClose]);

  if (paymentId === null) return null;

  const detail = detailQuery.data;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-3xl shadow-soft w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-text">Transaction detail</h2>
            <p className="text-xs text-muted break-all">{paymentId}</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-text transition" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {detailQuery.isLoading && <p className="text-sm text-muted">Loading transaction...</p>}
        {detailQuery.isError && <p className="text-sm text-danger-600">Couldn't load this transaction.</p>}

        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted">Student</p>
                <p className="text-text font-medium">{detail.payment.studentName}</p>
                <p className="text-muted">{detail.payment.studentEmail}</p>
              </div>
              <div>
                <p className="text-muted">Paid on</p>
                <p className="text-text font-medium">{formatDateTime(detail.payment.createdAt)}</p>
                <p className="text-muted">
                  {detail.payment.provider} · {detail.payment.status}
                </p>
              </div>
              <div>
                <p className="text-muted">Order id</p>
                <p className="text-text font-medium break-all">{detail.payment.providerOrderId}</p>
              </div>
              <div>
                <p className="text-muted">Payment id</p>
                <p className="text-text font-medium break-all">{detail.payment.providerPaymentId ?? '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-strong/60 rounded-2xl p-3">
                <p className="text-xs text-muted">Gross</p>
                <p className="text-lg font-bold text-text">{formatMoney(detail.totals.gross)}</p>
              </div>
              <div className="bg-surface-strong/60 rounded-2xl p-3">
                <p className="text-xs text-muted">Refunded</p>
                <p className="text-lg font-bold text-danger-600">{formatMoney(detail.totals.refunded)}</p>
              </div>
              <div className="bg-surface-strong/60 rounded-2xl p-3">
                <p className="text-xs text-muted">Final net</p>
                <p className="text-lg font-bold text-secondary-600">{formatMoney(detail.totals.net)}</p>
              </div>
            </div>

            <div className="space-y-4">
              {detail.items.map((item) => (
                <ItemCard key={item.paymentItemId} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}