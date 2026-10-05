import { api } from '../axios';
import type { CreateTaxConfigPayload, PeriodDetail, PeriodListRow, TaxConfig } from '../../types/membershipPeriods';

export async function getMembershipPeriods(): Promise<PeriodListRow[]> {
  const { data } = await api.get<PeriodListRow[]>('/admin/membership-periods');
  return data;
}

export async function getMembershipPeriodDetail(periodId: string): Promise<PeriodDetail> {
  const { data } = await api.get<PeriodDetail>(`/admin/membership-periods/${periodId}`);
  return data;
}

export async function calculateMembershipPeriod(periodId: string, refreshEngagement: boolean): Promise<PeriodDetail> {
  const { data } = await api.post<PeriodDetail>(`/admin/membership-periods/${periodId}/calculate`, { refreshEngagement });
  return data;
}

export async function finalizeMembershipPeriod(
  periodId: string,
  calculationId: string,
  acknowledgeUndistributedPool: boolean,
): Promise<PeriodDetail> {
  const { data } = await api.post<PeriodDetail>(`/admin/membership-periods/${periodId}/finalize`, {
    calculationId,
    acknowledgeUndistributedPool,
  });
  return data;
}

export async function getMembershipTaxConfigs(): Promise<TaxConfig[]> {
  const { data } = await api.get<TaxConfig[]>('/admin/membership-periods/tax-configs');
  return data;
}

export async function createMembershipTaxConfig(payload: CreateTaxConfigPayload): Promise<TaxConfig> {
  const { data } = await api.post<TaxConfig>('/admin/membership-periods/tax-configs', payload);
  return data;
}