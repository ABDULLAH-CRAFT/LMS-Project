import { useQuery } from '@tanstack/react-query'; // data-fetching hook
import { api } from '../lib/axios'; // shared axios instance with token attached
import type { CurrentUser } from '../types/user'; // response shape

export function useCurrentUser() { // reusable hook — call this from any dashboard page/component
  return useQuery({
    queryKey: ['current-user'], // cache key — shared across every place this hook is used
    queryFn: async () => { // the actual fetch logic
      const response = await api.get<CurrentUser>('/users/me'); // hits the new backend route
      return response.data; // unwrap axios's response wrapper
    },
    staleTime: 5 * 60 * 1000, // treat this data as fresh for 5 minutes — user info rarely changes mid-session
  });
}