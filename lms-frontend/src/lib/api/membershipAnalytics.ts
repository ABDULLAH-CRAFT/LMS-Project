import { api } from '../axios';
import type { MembershipOverview, MembershipPeriodAnalytics } from '../../types/membershipAnalytics';

export async function getMembershipOverview(periodId?: string): Promise<MembershipOverview> {
  const { data } = await api.get<MembershipOverview>('/admin/membership-analytics/overview', {
    params: periodId ? { periodId } : undefined,
  });
  return data;
}

export async function getMembershipPeriodAnalytics(periodId: string): Promise<MembershipPeriodAnalytics> {
  const { data } = await api.get<MembershipPeriodAnalytics>(`/admin/membership-analytics/periods/${periodId}`);
  return data;
}