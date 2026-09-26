import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { TeacherOverview } from '../types/course';

export const TEACHER_OVERVIEW_KEY = ['teacher-overview'];

// One shared query for the teacher's dashboard, drafts page, published page and profile.
// After anything changes (create / publish / add lesson / change cover), invalidate TEACHER_OVERVIEW_KEY.
export function useTeacherOverview(enabled = true) { // pass false on pages that students can also see, so no teacher-only request is made
  return useQuery({
    queryKey: TEACHER_OVERVIEW_KEY,
    enabled,
    queryFn: async () => {
      const response = await api.get<TeacherOverview>('/courses/mine/overview');
      return response.data;
    },
  });
}
