import { api } from '../axios';
import type {
  AdminCourseLite,
  AdminMembershipPlan,
  AdminSubscriptionList,
  MembershipCourse,
  MembershipPlan,
  MySubscription,
  PlanFormValues,
  SubscriptionStatus,
  SubscriptionSummary,
} from '../../types/membership';

export function apiErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (message) return message;
  return error instanceof Error ? error.message : fallback;
}

// ───────────── student ─────────────

export async function getMembershipPlans(): Promise<MembershipPlan[]> {
  const { data } = await api.get<MembershipPlan[]>('/memberships/plans');
  return data;
}

export async function getMySubscriptions(): Promise<MySubscription[]> {
  const { data } = await api.get<MySubscription[]>('/memberships/me');
  return data;
}

export async function getMyMembershipCourses(): Promise<MembershipCourse[]> {
  const { data } = await api.get<MembershipCourse[]>('/memberships/me/courses');
  return data;
}

export async function cancelSubscription(id: string): Promise<void> {
  await api.post(`/memberships/me/${id}/cancel`);
}

export async function resumeSubscription(id: string): Promise<void> {
  await api.post(`/memberships/me/${id}/resume`);
}

// ───────────── admin ─────────────

export async function adminListPlans(): Promise<AdminMembershipPlan[]> {
  const { data } = await api.get<AdminMembershipPlan[]>('/admin/memberships/plans');
  return data;
}

export async function adminCreatePlan(values: PlanFormValues): Promise<void> {
  await api.post('/admin/memberships/plans', {
    name: values.name.trim(),
    description: values.description.trim(),
    price: values.price.trim(),
    includesAllCourses: values.includesAllCourses,
  });
}

export async function adminUpdatePlan(id: string, values: PlanFormValues): Promise<void> {
  await api.patch(`/admin/memberships/plans/${id}`, {
    name: values.name.trim(),
    description: values.description.trim(),
    price: values.price.trim(),
    includesAllCourses: values.includesAllCourses,
  });
}

export async function adminSetPlanStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<void> {
  await api.patch(`/admin/memberships/plans/${id}/status`, { status });
}

export async function adminSetPlanCourses(
  id: string,
  payload: { courseIds: string[]; includesAllCourses: boolean },
): Promise<void> {
  await api.put(`/admin/memberships/plans/${id}/courses`, payload);
}

export async function adminListSubscriptions(
  status: SubscriptionStatus | '',
  limit: number,
  offset: number,
): Promise<AdminSubscriptionList> {
  const { data } = await api.get<AdminSubscriptionList>('/admin/memberships/subscriptions', {
    params: { status: status || undefined, limit, offset },
  });
  return data;
}

export async function adminSubscriptionSummary(): Promise<SubscriptionSummary> {
  const { data } = await api.get<SubscriptionSummary>('/admin/memberships/subscriptions/summary');
  return data;
}

export async function adminListAllCourses(): Promise<AdminCourseLite[]> {
  const { data } = await api.get<AdminCourseLite[]>('/admin/courses');
  return data;
}