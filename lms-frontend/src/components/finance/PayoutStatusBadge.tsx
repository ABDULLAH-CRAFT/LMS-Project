import type { PayoutStatus } from '../../types/payouts';

const STYLE: Record<PayoutStatus, string> = {
  PENDING: 'bg-tertiary-100 text-tertiary-700',
  APPROVED: 'bg-primary-100 text-primary-700',
  PROCESSING: 'bg-primary-100 text-primary-700',
  PAID: 'bg-secondary-100 text-secondary-700',
  FAILED: 'bg-danger-100 text-danger-700',
  REVERSED: 'bg-danger-100 text-danger-700',
  REJECTED: 'bg-surface-strong text-muted',
};

const LABEL: Record<PayoutStatus, string> = {
  PENDING: 'Waiting for approval',
  APPROVED: 'Approved',
  PROCESSING: 'Processing',
  PAID: 'Paid',
  FAILED: 'Failed',
  REVERSED: 'Reversed',
  REJECTED: 'Rejected',
};

export const payoutStatusLabel = (status: PayoutStatus): string => LABEL[status];

export default function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  return <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STYLE[status]}`}>{LABEL[status]}</span>;
}