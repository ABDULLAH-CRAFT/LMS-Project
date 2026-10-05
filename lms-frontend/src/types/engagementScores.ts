export type PeriodStatus = 'OPEN' | 'CALCULATING' | 'CALCULATED' | 'FINALIZED' | 'PAYOUT_PROCESSING' | 'PAID';

export interface EngagementPeriodRow {
  periodId: string;
  periodStart: string;
  periodEnd: string;
  status: PeriodStatus;
  latestRunId: string | null;
  latestRunNumber: number | null;
  latestCalculatedAt: string | null;
  teacherCount: number | null;
  isPartialPeriod: boolean | null;
  runCount: number;
}

export interface EngagementWeights {
  lessonCompletionBps: number;
  courseCompletionBps: number;
  assessmentBps: number;
  returningLearnerBps: number;
  ratingBps: number;
}

export interface EngagementWeightConfig extends EngagementWeights {
  id: string;
  effectiveFrom: string;
  note: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface EngagementTeacherScore {
  teacherId: string;
  teacherName: string;
  lessonCompletions: number;
  courseCompletions: number;
  assessmentEvents: number;
  returningLearners: number;
  ratingSum: number;
  activeLearners: number;
  lessonScore: string;
  courseCompletionScore: string;
  assessmentScore: string;
  returningLearnerScore: string;
  ratingScore: string;
  finalScore: string;
  poolSharePpm: number;
}

export interface EngagementRun {
  id: string;
  periodId: string;
  runNumber: number;
  weights: EngagementWeights;
  isPartialPeriod: boolean;
  teacherCount: number;
  totalScore: string;
  calculatedAt: string;
  calculatedByName: string | null;
  periodStart: string;
  periodEnd: string;
  periodStatus: PeriodStatus;
  scoreScale: number;
  shareScale: number;
  teachers: EngagementTeacherScore[];
}

export interface CreateEngagementWeightsPayload {
  effectiveMonth: string;
  lessonCompletion: string;
  courseCompletion: string;
  assessment: string;
  returningLearner: string;
  rating: string;
  note?: string;
}