import { PayoutStatus } from './payouts.enums';

// Single source of truth for the payout lifecycle. The database trigger payouts_guard() enforces the same rules.
export const ALLOWED_TRANSITIONS: Record<PayoutStatus, readonly PayoutStatus[]> = {
  [PayoutStatus.PENDING]: [PayoutStatus.APPROVED, PayoutStatus.REJECTED],
  [PayoutStatus.APPROVED]: [PayoutStatus.PROCESSING, PayoutStatus.REJECTED],
  [PayoutStatus.PROCESSING]: [PayoutStatus.PAID, PayoutStatus.FAILED],
  [PayoutStatus.FAILED]: [PayoutStatus.PROCESSING, PayoutStatus.REJECTED], // retry or cancel
  [PayoutStatus.PAID]: [PayoutStatus.REVERSED],
  [PayoutStatus.REJECTED]: [],
  [PayoutStatus.REVERSED]: [],
};

export const canTransition = (from: PayoutStatus, to: PayoutStatus): boolean => ALLOWED_TRANSITIONS[from].includes(to);

// Lines in a payout with one of these statuses are "reserved": not available, not yet paid.
export const RESERVING_STATUSES: readonly PayoutStatus[] = [
  PayoutStatus.PENDING,
  PayoutStatus.APPROVED,
  PayoutStatus.PROCESSING,
  PayoutStatus.FAILED,
];