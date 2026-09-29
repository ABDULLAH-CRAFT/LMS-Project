import { api } from '../axios';
import type {
  TeacherCourseEarningsResponse,
  TeacherOverview,
  TeacherRangeParams,
  TeacherStatementResponse,
} from '../../types/teacherFinance';

export async function getTeacherOverview(): Promise<TeacherOverview> {
  const { data } = await api.get<TeacherOverview>('/finance/teacher/overview');
  return data;
}

export async function getTeacherCourseEarnings(range: TeacherRangeParams): Promise<TeacherCourseEarningsResponse> {
  const { data } = await api.get<TeacherCourseEarningsResponse>('/finance/teacher/courses', { params: range });
  return data;
}

export async function getTeacherStatement(
  range: TeacherRangeParams,
  options: { limit: number; offset: number },
): Promise<TeacherStatementResponse> {
  const { data } = await api.get<TeacherStatementResponse>('/finance/teacher/statement', {
    params: { ...range, limit: options.limit, offset: options.offset },
  });
  return data;
}