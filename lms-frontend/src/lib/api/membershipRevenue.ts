import { api } from '../axios';
import type { MembershipPeriodPayment, MembershipRevenuePeriod } from '../../types/membershipRevenue';

export async function getMembershipRevenuePeriods(): Promise<MembershipRevenuePeriod[]> {
  const { data } = await api.get<MembershipRevenuePeriod[]>('/admin/memberships/revenue');
  return data;
}

export async function getMembershipPeriodPayments(periodId: string): Promise<MembershipPeriodPayment[]> {
  const { data } = await api.get<MembershipPeriodPayment[]>(`/admin/memberships/revenue/${periodId}/payments`);
  return data;
}