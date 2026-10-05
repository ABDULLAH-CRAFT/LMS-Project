export type MembershipPlanStatus = 'ACTIVE' | 'INACTIVE';
export type SubscriptionStatus = 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'PAUSED';

export interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  price: string; // exact string from the backend, e.g. "599.00"
  currency: string;
  billingPeriod: 'MONTHLY';
  status: MembershipPlanStatus;
  includesAllCourses: boolean;
  courseIds: string[];
  courseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminMembershipPlan extends MembershipPlan {
  activeSubscribers: number;
  totalSubscriptions: number;
}

export interface MySubscription {
  id: string;
  status: SubscriptionStatus;
  planId: string;
  planName: string;
  price: string;
  currency: string;
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  hasAccess: boolean;
}

export interface MembershipCourse {
  id: string;
  title: string;
  description: string;
  price: string;
  coverImageUrl: string | null;
  teacherId: string;
}

export interface AdminSubscriptionRow {
  id: string;
  status: SubscriptionStatus;
  studentName: string;
  studentEmail: string;
  planName: string;
  price: string;
  startDate: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
}

export interface AdminSubscriptionList {
  items: AdminSubscriptionRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface SubscriptionSummary {
  total: number;
  activeNow: number;
  cancellingAtPeriodEnd: number;
  pastDue: number;
  paused: number;
  cancelled: number;
  expired: number;
  newLast30Days: number;
}

export interface AdminCourseLite {
  id: string;
  title: string;
  status: 'draft' | 'published';
  teacher?: { name: string } | null;
}

export interface PlanFormValues {
  name: string;
  description: string;
  price: string;
  includesAllCourses: boolean;
}