// Money is a string such as "46648.00" from the backend's exact maths. The UI only formats it.

export type MembershipCategoryKey =
  | 'LESSON_COMPLETION'
  | 'COURSE_COMPLETION'
  | 'ASSESSMENT'
  | 'RETURNING_LEARNERS'
  | 'RATINGS';

export interface MembershipCategory {
  key: MembershipCategoryKey;
  label: string;
  score: string; // 0-100
  weightPercent: string;
  contributionPoints: string;
  contributionPercent: string; // share of the final score, adds up to 100.0
}

export interface MembershipPeriodMetrics {
  lessonCompletions: number;
  courseCompletions: number;
  assessmentEvents: number;
  returningLearners: number;
  activeLearners: number;
}

export interface TeacherMembershipPeriod {
  periodId: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;
  status: string;
  state: 'FINAL' | 'PROVISIONAL';
  isPartialPeriod: boolean;
  calculatedAt: string;
  finalizedAt: string | null;
  teacherPool: string;
  teacherPoolSharePercent: string;
  earnings: string;
  finalScore: string;
  metrics: MembershipPeriodMetrics;
  categories: MembershipCategory[];
}

export interface TeacherMembershipResponse {
  currency: string;
  summary: {
    finalizedEarnings: string;
    provisionalEarnings: string;
    finalizedPeriods: number;
  };
  periods: TeacherMembershipPeriod[];
}