// Money is a string such as "700.00" from the backend's exact maths. The UI only formats it.

export type CheckSeverity = 'CRITICAL' | 'WARNING';

export interface CheckSample {
  reference: string;
  detail: string;
  amount: string | null;
}

export interface CheckResult {
  code: string;
  title: string;
  description: string;
  severity: CheckSeverity;
  status: 'PASS' | 'FAIL';
  count: number;
  samples: CheckSample[];
}

export interface ReconciliationTie {
  label: string;
  leftLabel: string;
  left: string;
  rightLabel: string;
  right: string;
  matches: boolean;
}

export interface ReconciliationOverview {
  ranAt: string;
  status: 'HEALTHY' | 'WARNINGS' | 'CRITICAL';
  summary: { checkCount: number; passedCount: number; failedCount: number; criticalIssues: number; warningIssues: number };
  ties: ReconciliationTie[];
  figures: Record<string, string>;
  checks: CheckResult[];
}

export interface ReconciliationRunRow {
  id: string;
  ranAt: string;
  ranByName: string | null;
  checkCount: number;
  failedCount: number;
  criticalIssues: number;
  warningIssues: number;
}

export interface ReconciliationRunDetail {
  id: string;
  ranAt: string;
  ranByName: string | null;
  checks: CheckResult[];
  figures: Record<string, string>;
  ties: ReconciliationTie[];
}

export type AuditCategory = 'PAYOUT' | 'PERIOD' | 'REFUND' | 'CONFIG';

export interface AuditEvent {
  occurredAt: string;
  category: AuditCategory;
  action: string;
  actorId: string | null;
  actorName: string | null;
  summary: string;
  reference: string;
}

export interface AuditTrailResponse {
  events: AuditEvent[];
  paging: { limit: number; offset: number; total: number };
}

export interface TeacherOption {
  id: string;
  name: string;
  email: string;
}

export interface TeacherExplain {
  teacher: TeacherOption;
  courseSales: { earned: string; refundAdjustments: string; net: string; sales: number; reversals: number };
  membership: {
    total: string;
    periods: {
      periodId: string;
      periodStart: string;
      periodEnd: string;
      status: string;
      calculationId: string;
      runNumber: number;
      eligibleRevenue: string;
      teacherPool: string;
      poolSharePercent: string;
      finalScore: string;
      amount: string;
    }[];
  };
  net: string;
  balance: {
    pendingEarnings: string;
    availableBalance: string;
    processingBalance: string;
    paidBalance: string;
    adjustmentBalance: string;
    lifetimeNet: string;
  };
  payouts: { status: string; count: number; amount: string }[];
  reconciles: boolean;
}

export interface TeacherCourseLine {
  id: string;
  occurredAt: string;
  type: string;
  courseTitle: string | null;
  studentName: string | null;
  paymentId: string | null;
  transactionAmount: string;
  percentage: string;
  teacherAmount: string;
  payoutId: string | null;
  payoutStatus: string | null;
}

export interface TeacherCourseLinesResponse {
  lines: TeacherCourseLine[];
  paging: { limit: number; offset: number; total: number };
}

export interface EngagementBreakdown {
  teacher: TeacherOption;
  period: { periodId: string; periodStart: string; periodEnd: string; status: string };
  calculation: {
    calculationId: string;
    runNumber: number;
    eligibleRevenue: string;
    platformPercentage: string;
    teacherPercentage: string;
    teacherPool: string;
    distributedAmount: string;
  };
  engagement: {
    activeLearners: number;
    categories: {
      key: string;
      label: string;
      rawMetric: number;
      categoryScore: string;
      weightPercent: string;
      contribution: string;
      shareOfFinalPercent: string;
    }[];
    finalScore: string;
    runTotalScore: string;
    teachersInRun: number;
    scoreVerified: boolean;
  };
  allocation: { allocationId: string; poolSharePercent: string; amount: string };
}

export interface TraceAllocation {
  id: string;
  recipientType: string;
  recipientName: string | null;
  percentage: string;
  amount: string;
  payoutId: string | null;
  payoutStatus: string | null;
}

export interface PaymentTrace {
  payment: {
    id: string;
    amount: string;
    currency: string;
    status: string;
    provider: string;
    providerOrderId: string;
    providerPaymentId: string | null;
    createdAt: string;
    updatedAt: string;
    studentName: string | null;
    studentEmail: string | null;
  };
  settlement: { courseItemCount: number; membershipItemCount: number; revenueTransactionCount: number; settledAt: string } | null;
  items: {
    id: string;
    referenceType: string;
    label: string | null;
    lineTotal: string;
    hasRevenue: boolean;
    needsRevenue: boolean;
    netLedgerAmount: string;
    ledger: { id: string; type: string; amount: string; occurredAt: string; periodId: string | null; allocations: TraceAllocation[] }[];
    subscriptionPayment: { id: string; subscriptionId: string; status: string; periodStart: string; periodEnd: string; amount: string } | null;
  }[];
  refunds: { id: string; kind: string; amount: string; providerRefundId: string; occurredAt: string; reason: string | null }[];
  flags: { itemsMissingRevenue: number; paymentAmountMatchesItems: boolean };
}