import { api } from '../axios';
import type {
  AuditCategory,
  AuditTrailResponse,
  EngagementBreakdown,
  PaymentTrace,
  ReconciliationOverview,
  ReconciliationRunDetail,
  ReconciliationRunRow,
  TeacherCourseLinesResponse,
  TeacherExplain,
  TeacherOption,
} from '../../types/reconciliation';

const base = '/admin/reconciliation';

export async function getReconciliationOverview(): Promise<ReconciliationOverview> {
  const { data } = await api.get<ReconciliationOverview>(`${base}/overview`);
  return data;
}

export async function runReconciliation(): Promise<ReconciliationOverview & { runId: string }> {
  const { data } = await api.post<ReconciliationOverview & { runId: string }>(`${base}/run`);
  return data;
}

export async function listReconciliationRuns(): Promise<ReconciliationRunRow[]> {
  const { data } = await api.get<ReconciliationRunRow[]>(`${base}/runs`);
  return data;
}

export async function getReconciliationRun(runId: string): Promise<ReconciliationRunDetail> {
  const { data } = await api.get<ReconciliationRunDetail>(`${base}/runs/${runId}`);
  return data;
}

export async function getAuditTrail(params: { category?: AuditCategory; limit: number; offset: number }): Promise<AuditTrailResponse> {
  const { data } = await api.get<AuditTrailResponse>(`${base}/audit-trail`, { params });
  return data;
}

export async function listReconciliationTeachers(): Promise<TeacherOption[]> {
  const { data } = await api.get<TeacherOption[]>(`${base}/teachers`);
  return data;
}

export async function explainTeacher(teacherId: string): Promise<TeacherExplain> {
  const { data } = await api.get<TeacherExplain>(`${base}/teachers/${teacherId}/explain`);
  return data;
}

export async function getTeacherCourseLines(teacherId: string, limit: number, offset: number): Promise<TeacherCourseLinesResponse> {
  const { data } = await api.get<TeacherCourseLinesResponse>(`${base}/teachers/${teacherId}/course-lines`, { params: { limit, offset } });
  return data;
}

export async function getEngagementBreakdown(teacherId: string, periodId: string): Promise<EngagementBreakdown> {
  const { data } = await api.get<EngagementBreakdown>(`${base}/teachers/${teacherId}/periods/${periodId}/engagement`);
  return data;
}

export async function getPaymentTrace(paymentId: string): Promise<PaymentTrace> {
  const { data } = await api.get<PaymentTrace>(`${base}/payments/${paymentId}/trace`);
  return data;
}