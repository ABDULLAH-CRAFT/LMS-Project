// Money is a string such as "700.00" from the backend's exact maths. The UI only formats it.

export type PayoutStatus = 'PENDING' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REVERSED' | 'REJECTED';

export interface PayoutBalances {
  pendingEarnings: string; // inside the hold window
  availableBalance: string; // can be requested (negative after a late refund)
  processingBalance: string; // in a payout that is not paid yet
  paidBalance: string;
  adjustmentBalance: string; // informational, already included above
  lifetimeNet: string;
}

export interface TeacherBalanceResponse {
  currency: string;
  settings: { holdDays: number; minimumPayout: string };
  balances: PayoutBalances;
  nextReleaseAt: string | null;
  canRequest: boolean;
  cannotRequestReason: string | null;
  hasOpenRequest: boolean;
}

export interface PayoutRow {
  id: string;
  amount: string;
  currency: string;
  status: PayoutStatus;
  provider: string;
  providerPayoutId: string | null;
  itemCount: number;
  requestedAt: string;
  approvedAt: string | null;
  processingAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
  // admin only
  teacher?: { id: string; name: string; email: string };
  periodId?: string | null;
  retryCount?: number;
  approvedByName?: string | null;
  rejectedByName?: string | null;
}

export interface PayoutItem {
  id: string;
  kind: 'COURSE_ALLOCATION' | 'MEMBERSHIP_ALLOCATION';
  description: string;
  reference: string | null;
  occurredAt: string | null;
  amount: string;
  released: boolean;
}

export interface PayoutEvent {
  fromStatus?: PayoutStatus | null;
  toStatus: PayoutStatus;
  actorRole?: string;
  actorName?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface PayoutDetail extends PayoutRow {
  items: PayoutItem[];
  events: PayoutEvent[];
}

export interface PayoutListResponse {
  payouts: PayoutRow[];
  paging: { limit: number; offset: number; total: number };
  summary?: { status: PayoutStatus; count: number; amount: string }[];
}

export interface AdminBalanceRow {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  balances: PayoutBalances;
  openRequests: number;
  canRequest: boolean;
}

export interface AdminBalancesResponse {
  settings: { holdDays: number; minimumPayout: string };
  teachers: AdminBalanceRow[];
}

export interface AdminTeacherStatement {
  teacher: { id: string; name: string; email: string };
  balance: TeacherBalanceResponse;
  payouts: PayoutRow[];
}

export interface PayoutSettingsRow {
  id: string;
  holdDays: number;
  minimumPayout: string;
  effectiveFrom: string;
  note: string | null;
  createdByName: string | null;
}

export interface PayoutSettingsResponse {
  current: { holdDays: number; minimumPayout: string; effectiveFrom: string };
  history: PayoutSettingsRow[];
}

export interface UpdatePayoutSettingsPayload {
  holdDays: number;
  minimumPayout: string;
  note?: string;
}