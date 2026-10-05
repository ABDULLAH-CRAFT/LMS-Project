export interface MembershipRevenuePeriod {
  periodId: string;
  periodStart: string; // "2026-10-01"
  periodEnd: string; // "2026-10-31"
  status: 'OPEN' | 'CALCULATING' | 'CALCULATED' | 'FINALIZED' | 'PAYOUT_PROCESSING' | 'PAID';
  payments: number;
  grossMembershipRevenue: string;
  projectedPlatformShare: string;
  projectedTeacherPool: string;
  appliedRule: { platformPercentage: string; teacherPercentage: string };
  projectionOnly: boolean;
}

export interface MembershipPeriodPayment {
  transactionId: string;
  amount: string;
  currency: string;
  occurredAt: string;
  paymentId: string;
  studentName: string | null;
  studentEmail: string | null;
  planName: string | null;
  paidFrom: string | null;
  paidUntil: string | null;
  subscriptionStatus: string | null;
}