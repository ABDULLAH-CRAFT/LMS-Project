import type { RangePreset } from './finance';

// Money is a string such as "700.00" from the backend's exact maths. The UI only formats it.

export type TeacherRangePreset = RangePreset | 'all';

export interface TeacherRangeParams {
  preset: TeacherRangePreset;
  from?: string;
  to?: string;
}

export interface TeacherRangeView {
  preset: TeacherRangePreset;
  from: string | null; // null for "all"
  to: string | null;
}

export interface TeacherOverview {
  currency: string;
  totalEarnings: string;
  courseSalesEarnings: string;
  membershipEarnings: string;
  refundAdjustments: string; // negative or 0.00
  netEarnings: string;
  pendingPayout: string;
  paidAmount: string;
  sales: number;
  refundEvents: number;
  thisMonthNet: string;
  monthly: { month: string; net: string; sales: number }[]; // month = "YYYY-MM"
}

export interface TeacherCourseEarning {
  courseId: string;
  title: string;
  status: string;
  students: number;
  sales: number;
  grossRevenue: string;
  lmsShare: string;
  teacherShare: string;
  refunds: string;
  netEarnings: string;
}

export interface TeacherCourseEarningsResponse {
  range: TeacherRangeView;
  courses: TeacherCourseEarning[];
  totals: {
    sales: number;
    grossRevenue: string;
    lmsShare: string;
    teacherShare: string;
    refunds: string;
    netEarnings: string;
  };
}

export type StatementStatus = 'EARNED' | 'PARTIALLY_REFUNDED' | 'REFUNDED';

export interface StatementRefund {
  reference: string;
  type: string;
  occurredAt: string;
  amount: string; // negative
}

export interface StatementEntry {
  allocationId: string;
  occurredAt: string;
  reference: string;
  courseTitle: string;
  learnerRef: string;
  grossAmount: string;
  teacherPercentage: string;
  teacherEarning: string;
  adjustments: string;
  netEarning: string;
  status: StatementStatus;
  payoutStatus: 'PENDING';
  refunds: StatementRefund[];
}

export interface TeacherStatementResponse {
  range: TeacherRangeView;
  entries: StatementEntry[];
  totals: {
    entries: number;
    grossAmount: string;
    teacherEarning: string;
    adjustments: string;
    netEarning: string;
  };
  paging: { limit: number; offset: number; total: number };
}