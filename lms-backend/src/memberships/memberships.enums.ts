export enum MembershipPlanStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

// Only MONTHLY for now: the revenue pool is monthly, and multi-month plans need a
// revenue-recognition decision (spread over months?) before they are safe to add.
export enum MembershipBillingPeriod {
  MONTHLY = 'MONTHLY',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  TRIALING = 'TRIALING',
  PAST_DUE = 'PAST_DUE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  PAUSED = 'PAUSED',
}

// payment_items.referenceType for a membership payment (course payments use 'course_enrollment')
export const MEMBERSHIP_REFERENCE_TYPE = 'membership_plan';

// Statuses that count as "the student still has a live subscription row" (unique per student+plan).
export const LIVE_SUBSCRIPTION_STATUSES = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.PAUSED,
];

// Statuses that can grant course access (and only while currentPeriodEnd is in the future).
export const ACCESS_SUBSCRIPTION_STATUSES = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING];

// A student may renew early only when this many days (or fewer) remain.
export const RENEWAL_WINDOW_DAYS = 7;