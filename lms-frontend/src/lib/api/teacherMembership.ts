import { api } from '../axios';
import type { TeacherMembershipResponse } from '../../types/teacherMembership';

export async function getTeacherMembershipEarnings(limit = 12): Promise<TeacherMembershipResponse> {
  const { data } = await api.get<TeacherMembershipResponse>('/finance/teacher/membership', { params: { limit } });
  return data;
}