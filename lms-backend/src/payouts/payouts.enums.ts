export enum PayoutStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
  REJECTED = 'REJECTED',
}

export enum PayoutItemKind {
  COURSE_ALLOCATION = 'COURSE_ALLOCATION',
  MEMBERSHIP_ALLOCATION = 'MEMBERSHIP_ALLOCATION',
}

// Real bank payouts (e.g. RazorpayX) can be added later as another provider value.
export const PAYOUT_PROVIDER_MANUAL = 'MANUAL';