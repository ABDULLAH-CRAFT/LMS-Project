import { api } from '../axios';
import type {
  CourseRevenueResponse,
  FinanceRangeParams,
  RevenueOverview,
  TeacherRevenueResponse,
  TransactionDetail,
  TransactionListResponse,
} from '../../types/finance';

// axios drops undefined params, so from/to are only sent for the custom range.
export async function getRevenueOverview(range: FinanceRangeParams): Promise<RevenueOverview> {
  const { data } = await api.get<RevenueOverview>('/admin/finance/overview', { params: range });
  return data;
}

export async function getTeacherRevenue(range: FinanceRangeParams): Promise<TeacherRevenueResponse> {
  const { data } = await api.get<TeacherRevenueResponse>('/admin/finance/teachers', { params: range });
  return data;
}

export async function getCourseRevenue(range: FinanceRangeParams): Promise<CourseRevenueResponse> {
  const { data } = await api.get<CourseRevenueResponse>('/admin/finance/courses', { params: range });
  return data;
}

export async function getTransactions(
  range: FinanceRangeParams,
  options: { limit: number; offset: number; search?: string },
): Promise<TransactionListResponse> {
  const { data } = await api.get<TransactionListResponse>('/admin/finance/transactions', {
    params: { ...range, limit: options.limit, offset: options.offset, search: options.search || undefined },
  });
  return data;
}

export async function getTransactionDetail(paymentId: string): Promise<TransactionDetail> {
  const { data } = await api.get<TransactionDetail>(`/admin/finance/transactions/${paymentId}`);
  return data;
}