export type AnalyticsPeriodStatus = 'OPEN' | 'CALCULATING' | 'CALCULATED' | 'FINALIZED' | 'PAYOUT_PROCESSING' | 'PAID';

export type TeacherPayoutStatus = 'NOT_FINALIZED' | 'PENDING' | 'PROCESSING' | 'PAID';

export interface AnalyticsRightNow {
  activeSubscribers: number;
  cancellingAtPeriodEnd: number;
  pastDue: number;
  paused: number;
  monthlyRecurringRevenue: string;
  mrrAtRisk: string;
}

export interface AnalyticsPeriodRef {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: AnalyticsPeriodStatus;
  isPartial: boolean;
}

export interface AnalyticsPeriodKpis {
  newSubscribers: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
  cancellationRequests: number;
  activeAtStart: number;
  activeAtEnd: number;
  lostSubscribers: number;
  churnRatePercent: string | null;
  renewalsRenewed: number;
  renewalsLapsed: number;
  renewalsPending: number;
  renewalRatePercent: string | null;
  paymentCount: number;
  payingSubscribers: number;
  grossRevenue: string;
  refundsAmount: string;
  netRevenue: string;
  averageRevenuePerSubscriber: string | null;
}

export interface AnalyticsTrendRow {
  periodId: string;
  periodStart: string;
  periodEnd: string;
  status: AnalyticsPeriodStatus;
  grossRevenue: string;
  refundsAmount: string;
  netRevenue: string;
  payingSubscribers: number;
  newSubscribers: number;
}

export interface MembershipOverview {
  asOf: string;
  renewalGraceDays: number;
  rightNow: AnalyticsRightNow;
  period: AnalyticsPeriodRef | null;
  periodKpis: AnalyticsPeriodKpis | null;
  trend: AnalyticsTrendRow[];
}

export interface CategoryValues {
  lesson: string;
  courseCompletion: string;
  assessment: string;
  returningLearner: string;
  rating: string;
}

export interface AnalyticsTeacher {
  teacherId: string;
  teacherName: string;
  finalScore: string; // score x scoreScale
  poolSharePpm: number; // x shareScale
  membershipEarnings: string;
  adjustments: string;
  netEarnings: string;
  payoutStatus: TeacherPayoutStatus;
  activeLearners: number;
  lessonCompletions: number;
  courseCompletions: number;
  assessmentActivity: number;
  returningLearners: number;
  ratingCount: number;
  averageRating: string | null;
  categoryScores: CategoryValues; // each x scoreScale
  scoreContributions: CategoryValues; // each x scoreScale
}

export interface AnalyticsCalculation {
  id: string;
  runNumber: number;
  isFinal: boolean;
  isPartialPeriod: boolean;
  calculatedAt: string;
  calculatedByName: string | null;
  engagementRunNumber: number;
  platformPercentage: string;
  teacherPercentage: string;
  taxRatePercent: string;
  paymentCount: number;
  reversalCount: number;
  grossRevenue: string;
  refundsAmount: string;
  taxAmount: string;
  eligibleRevenue: string;
  platformRevenue: string;
  teacherPool: string;
  distributedAmount: string;
  undistributedAmount: string;
  teacherCount: number;
  weights: {
    lessonCompletionBps: number;
    courseCompletionBps: number;
    assessmentBps: number;
    returningLearnerBps: number;
    ratingBps: number;
  };
  scoreScale: number;
  shareScale: number;
}

export interface MembershipPeriodAnalytics {
  period: {
    id: string;
    periodStart: string;
    periodEnd: string;
    status: AnalyticsPeriodStatus;
    ended: boolean;
    finalizedAt: string | null;
    finalizedByName: string | null;
  };
  live: { paymentCount: number; grossRevenue: string; refundsAmount: string };
  calculation: AnalyticsCalculation | null;
  teachers: AnalyticsTeacher[];
  totals: { membershipEarnings: string; matchesDistributedAmount: boolean } | null;
}