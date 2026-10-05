import { api } from '../axios';
import type {
  AdminBalancesResponse,
  AdminTeacherStatement,
  PayoutDetail,
  PayoutListResponse,
  PayoutSettingsResponse,
  PayoutStatus,
  TeacherBalanceResponse,
  UpdatePayoutSettingsPayload,
} from '../../types/payouts';

// ── teacher ──
export async function getTeacherBalance(): Promise<TeacherBalanceResponse> {
  const { data } = await api.get<TeacherBalanceResponse>('/finance/teacher/balance');
  return data;
}

export async function listTeacherPayouts(limit: number, offset: number): Promise<PayoutListResponse> {
  const { data } = await api.get<PayoutListResponse>('/finance/teacher/payouts', { params: { limit, offset } });
  return data;
}

export async function getTeacherPayout(id: string): Promise<PayoutDetail> {
  const { data } = await api.get<PayoutDetail>(`/finance/teacher/payouts/${id}`);
  return data;
}

export async function requestTeacherPayout(): Promise<PayoutDetail> {
  const { data } = await api.post<PayoutDetail>('/finance/teacher/payouts/request');
  return data;
}

// ── admin ──
export async function listAdminPayouts(params: {
  status?: PayoutStatus;
  limit: number;
  offset: number;
}): Promise<PayoutListResponse> {
  const { data } = await api.get<PayoutListResponse>('/admin/payouts', { params });
  return data;
}

export async function getAdminPayout(id: string): Promise<PayoutDetail> {
  const { data } = await api.get<PayoutDetail>(`/admin/payouts/${id}`);
  return data;
}

export async function getAdminBalances(): Promise<AdminBalancesResponse> {
  const { data } = await api.get<AdminBalancesResponse>('/admin/payouts/balances');
  return data;
}

export async function getAdminTeacherStatement(teacherId: string): Promise<AdminTeacherStatement> {
  const { data } = await api.get<AdminTeacherStatement>(`/admin/payouts/teachers/${teacherId}/statement`);
  return data;
}

export async function getPayoutSettings(): Promise<PayoutSettingsResponse> {
  const { data } = await api.get<PayoutSettingsResponse>('/admin/payouts/settings');
  return data;
}

export async function updatePayoutSettings(payload: UpdatePayoutSettingsPayload): Promise<PayoutSettingsResponse> {
  const { data } = await api.post<PayoutSettingsResponse>('/admin/payouts/settings', payload);
  return data;
}

export async function approvePayout(id: string): Promise<PayoutDetail> {
  const { data } = await api.post<PayoutDetail>(`/admin/payouts/${id}/approve`);
  return data;
}

export async function rejectPayout(id: string, reason: string): Promise<PayoutDetail> {
  const { data } = await api.post<PayoutDetail>(`/admin/payouts/${id}/reject`, { reason });
  return data;
}

export async function startPayoutProcessing(id: string): Promise<PayoutDetail> {
  const { data } = await api.post<PayoutDetail>(`/admin/payouts/${id}/process`);
  return data;
}

export async function retryPayout(id: string): Promise<PayoutDetail> {
  const { data } = await api.post<PayoutDetail>(`/admin/payouts/${id}/retry`);
  return data;
}

export async function markPayoutPaid(id: string, providerPayoutId: string): Promise<PayoutDetail> {
  const { data } = await api.post<PayoutDetail>(`/admin/payouts/${id}/mark-paid`, { providerPayoutId });
  return data;
}

export async function markPayoutFailed(id: string, reason: string): Promise<PayoutDetail> {
  const { data } = await api.post<PayoutDetail>(`/admin/payouts/${id}/mark-failed`, { reason });
  return data;
}

export async function reversePayout(id: string, reason: string): Promise<PayoutDetail> {
  const { data } = await api.post<PayoutDetail>(`/admin/payouts/${id}/reverse`, { reason });
  return data;
}