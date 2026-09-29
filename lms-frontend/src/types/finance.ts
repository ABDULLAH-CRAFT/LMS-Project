// Money is always a string like "1000.00" (straight from the backend's exact maths).
// The UI only formats it for display and never calculates with it.

export type RangePreset = 'today' | '7d' | '30d' | 'this_month' | 'last_month' | 'custom';

export interface FinanceRangeParams {
  preset: RangePreset;
  from?: string;
  to?: string;
}

export interface FinanceRangeView {
  preset: RangePreset;
  from: string; // YYYY-MM-DD (IST)
  to: string; // YYYY-MM-DD (IST), inclusive
}

export interface RevenueOverview {
  range: FinanceRangeView;
  grossSales: string;
  refunds: string;
  eligibleRevenue: string;
  lmsRevenue: string;
  teacherRevenue: string;
  itemsSold: number;
  orders: number;
  refundEvents: number;
  averageOrderValue: string;
  reconciled: boolean;
}

export interface TeacherRevenueRow {
  teacherId: string;
  name: string;
  email: string;
  courses: number;
  sales: number;
  grossRevenue: string;
  lmsShare: string;
  teacherShare: string;
  refunds: string;
  netEarnings: string;
  pendingPayout: string;
  paidOut: string;
}

export interface TeacherRevenueResponse {
  range: FinanceRangeView;
  teachers: TeacherRevenueRow[];
  totals: {
    sales: number;
    grossRevenue: string;
    lmsShare: string;
    teacherShare: string;
    refunds: string;
    netEarnings: string;
    pendingPayout: string;
    paidOut: string;
  };
}

export interface CourseRevenueRow {
  courseId: string;
  title: string;
  teacherId: string | null;
  teacherName: string;
  orders: number;
  grossSales: string;
  refunds: string;
  lmsRevenue: string;
  teacherRevenue: string;
}

export interface CourseRevenueResponse {
  range: FinanceRangeView;
  courses: CourseRevenueRow[];
  totals: {
    orders: number;
    grossSales: string;
    refunds: string;
    lmsRevenue: string;
    teacherRevenue: string;
  };
}

export type TransactionStatus = 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED';

export interface TransactionRow {
  paymentId: string;
  paidAt: string;
  providerOrderId: string;
  providerPaymentId: string | null;
  currency: string;
  studentId: string | null;
  studentName: string;
  studentEmail: string;
  items: number;
  gross: string;
  refunded: string;
  net: string;
  lmsNet: string;
  teacherNet: string;
  status: TransactionStatus;
}

export interface TransactionListResponse {
  range: FinanceRangeView;
  transactions: TransactionRow[];
  paging: { limit: number; offset: number; total: number };
}

export interface AllocationView {
  recipientType: 'PLATFORM' | 'TEACHER';
  recipientId: string | null;
  recipientName: string;
  percentage: string;
  amount: string;
}

export interface RevenueTransactionView {
  transactionId: string;
  type: string; // COURSE_PURCHASE | REFUND | CHARGEBACK
  amount: string;
  currency: string;
  occurredAt: string;
  allocations: AllocationView[];
}

export interface RefundView {
  refundId: string;
  providerRefundId: string;
  kind: string;
  source: string;
  reason: string | null;
  initiatedById: string | null;
  initiatedByName: string | null;
  accessRevoked: boolean;
}

export interface ReversalView extends RevenueTransactionView {
  refund: RefundView | null;
}

export interface NetRecipientView {
  recipientType: 'PLATFORM' | 'TEACHER';
  recipientId: string | null;
  recipientName: string;
  net: string;
}

export interface TransactionItemDetail {
  paymentItemId: string;
  courseId: string | null;
  courseTitle: string | null;
  original: RevenueTransactionView;
  reversals: ReversalView[];
  finalNet: string;
  netByRecipient: NetRecipientView[];
}

export interface TransactionDetail {
  payment: {
    id: string;
    amount: string;
    currency: string;
    status: string;
    provider: string;
    providerOrderId: string;
    providerPaymentId: string | null;
    createdAt: string;
    studentId: string | null;
    studentName: string;
    studentEmail: string;
  };
  items: TransactionItemDetail[];
  totals: { gross: string; refunded: string; net: string };
}