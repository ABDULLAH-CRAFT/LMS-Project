export enum RevenueTransactionType {
  COURSE_PURCHASE = 'COURSE_PURCHASE',
  MEMBERSHIP_PAYMENT = 'MEMBERSHIP_PAYMENT', // used from Phase R7
  REFUND = 'REFUND',
  CHARGEBACK = 'CHARGEBACK',
  ADJUSTMENT = 'ADJUSTMENT',
}

// Ledger rows never change after insert, so there is only one status.
// "Reversed / net" is derived from the existence of reversal rows.
export enum RevenueTransactionStatus {
  POSTED = 'POSTED',
}

export enum RevenueRecipientType {
  PLATFORM = 'PLATFORM',
  TEACHER = 'TEACHER',
}

export enum RevenueSourceType {
  COURSE_PURCHASE = 'COURSE_PURCHASE',
  MEMBERSHIP_POOL = 'MEMBERSHIP_POOL',
}

export enum RevenuePeriodStatus {
  OPEN = 'OPEN',
  CALCULATING = 'CALCULATING',
  CALCULATED = 'CALCULATED',
  FINALIZED = 'FINALIZED',
  PAYOUT_PROCESSING = 'PAYOUT_PROCESSING',
  PAID = 'PAID',
}

// Bump when the allocation ALGORITHM changes (not when percentages change,
// those are versioned by revenue_rules).
export const CALCULATION_VERSION = 1;