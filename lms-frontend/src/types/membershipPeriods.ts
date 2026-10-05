export type PeriodStatus = 'OPEN' | 'CALCULATING' | 'CALCULATED' | 'FINALIZED' | 'PAYOUT_PROCESSING' | 'PAID';

export interface PeriodListRow {
  periodId: string;
  periodStart: string;
  periodEnd: string;
  status: PeriodStatus;
  ended: boolean;
  finalizedAt: string | null;
  finalizedByName: string | null;
  paymentCount: number;
  grossRevenue: string;
  refundsAmount: string;
  latestCalculation: {
    id: string;
    runNumber: number;
    calculatedAt: string;
    eligibleRevenue: string;
    platformRevenue: string;
    teacherPool: string;
    teacherCount: number;
  } | null;
}

export interface PeriodTeacherAllocation {
  teacherId: string;
  teacherName: string;
  finalScore: string; // score x scoreScale
  poolSharePpm: number; // x shareScale
  amount: string;
  lessonScore: string;
  courseCompletionScore: string;
  assessmentScore: string;
  returningLearnerScore: string;
  ratingScore: string;
  activeLearners: number;
}

export interface PeriodCalculation {
  id: string;
  periodId: string;
  runNumber: number;
  engagementRunId: string;
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
  isPartialPeriod: boolean;
  calculatedAt: string;
  calculatedByName: string | null;
  scoreScale: number;
  shareScale: number;
  teachers: PeriodTeacherAllocation[];
}

export interface PeriodBlocker {
  code: string;
  message: string;
}

export interface PeriodDetail {
  period: {
    id: string;
    periodStart: string;
    periodEnd: string;
    status: PeriodStatus;
    ended: boolean;
    finalizedAt: string | null;
    finalizedByName: string | null;
    finalCalculationId: string | null;
  };
  live: { paymentCount: number; reversalCount: number; grossRevenue: string; refundsAmount: string };
  latestCalculation: PeriodCalculation | null;
  history: {
    id: string;
    runNumber: number;
    calculatedAt: string;
    eligibleRevenue: string;
    teacherPool: string;
    teacherCount: number;
    calculatedByName: string | null;
  }[];
  readiness: {
    canFinalize: boolean;
    blockers: PeriodBlocker[];
    stale: boolean;
    requiresUndistributedAcknowledgement: boolean;
  };
}

export interface TaxConfig {
  id: string;
  taxRateBps: number;
  effectiveFrom: string;
  note: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface CreateTaxConfigPayload {
  effectiveMonth: string;
  taxRate: string;
  note?: string;
}