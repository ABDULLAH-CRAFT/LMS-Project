// lms-frontend/src/pages/AdminDashboard.tsx
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Mail, Lock, Search, CalendarDays, ShieldCheck } from 'lucide-react';
import { api } from '../lib/axios';
import DashboardLayout from '../components/DashboardLayout';
import { adminSidebarSections } from '../config/adminSidebar';
import type { CurrentUser } from '../types/user';

interface CreateTeacherForm {
  name: string;
  email: string;
  password: string;
}

const AVATAR_RAMPS = [
  'from-primary-500 to-primary-700',
  'from-secondary-400 to-secondary-600',
  'from-tertiary-400 to-tertiary-600',
];

function avatarRamp(seed: string) {
  const index = seed.charCodeAt(0) % AVATAR_RAMPS.length;
  return AVATAR_RAMPS[index];
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateTeacherForm>({ name: '', email: '', password: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');

  const teachersQuery = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const response = await api.get<CurrentUser[]>('/admin/teachers');
      return response.data;
    },
  });

  const createTeacherMutation = useMutation({
    mutationFn: async (data: CreateTeacherForm) => {
      const response = await api.post('/admin/create-teacher', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setFormData({ name: '', email: '', password: '' });
      setErrorMessage('');
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.message || 'Failed to create teacher');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    createTeacherMutation.mutate(formData);
  };

  const teachers = teachersQuery.data ?? [];

  // Derived stats — computed client-side from the same list we already fetch,
  // no extra backend endpoint needed.
  const { totalTeachers, joinedThisMonth, mostRecent } = useMemo(() => {
    const now = new Date();
    const thisMonthCount = teachers.filter((t) => {
      const created = new Date(t.createdAt);
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;

    const sorted = [...teachers].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return {
      totalTeachers: teachers.length,
      joinedThisMonth: thisMonthCount,
      mostRecent: sorted[0] ?? null,
    };
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    if (!search.trim()) return teachers;
    const q = search.trim().toLowerCase();
    return teachers.filter(
      (t) => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q),
    );
  }, [teachers, search]);

  return (
    <DashboardLayout sidebarSections={adminSidebarSections}>
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-600 to-secondary-400 flex items-center justify-center shadow-primary-glow">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-text">Admin</h1>
      </div>
      <p className="text-muted mb-8">Create teacher accounts and see everyone with teaching access.</p>

      {/* Stat cards — all derived from real data already returned by /admin/teachers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 max-w-3xl">
        <div className="bg-surface rounded-2xl shadow-soft p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-primary-700" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-text leading-none">{totalTeachers}</p>
            <p className="text-xs text-muted-dark mt-1">Total teachers</p>
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-soft p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-secondary-100 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5 text-secondary-600" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-text leading-none">{joinedThisMonth}</p>
            <p className="text-xs text-muted-dark mt-1">Joined this month</p>
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-soft p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-tertiary-100 flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5 text-tertiary-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-text leading-tight truncate">
              {mostRecent ? mostRecent.name : '—'}
            </p>
            <p className="text-xs text-muted-dark mt-1">Latest addition</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 max-w-5xl">
        {/* Add teacher form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-2 bg-surface rounded-2xl p-6 shadow-soft h-fit"
        >
          <div className="flex items-center gap-2 mb-5">
            <UserPlus className="w-4 h-4 text-primary-600" />
            <h2 className="font-semibold text-text">Add a new teacher</h2>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Users className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-surface-strong border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition"
              />
            </div>

            <div className="relative">
              <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-surface-strong border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition"
              />
            </div>

            <div className="relative">
              <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Temporary password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-surface-strong border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition"
              />
            </div>
          </div>

          <p className="text-xs text-muted mt-3">This will be emailed to the teacher — at least 6 characters.</p>

          {errorMessage && (
            <p className="text-danger-600 text-xs mt-3 bg-danger-50 border border-danger-100 rounded-lg px-3 py-2">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={createTeacherMutation.isPending}
            className="w-full bg-gradient-to-r from-primary-600 to-secondary-400 text-white rounded-xl py-2.5 text-sm font-semibold mt-4 hover:scale-[1.01] transition disabled:opacity-50 shadow-primary-glow"
          >
            {createTeacherMutation.isPending ? 'Creating...' : 'Create teacher'}
          </button>
        </form>

        {/* Teacher list */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3 gap-3">
            <h2 className="font-semibold text-text">All teachers</h2>
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface-strong border border-border rounded-full pl-8 pr-3 py-1.5 text-xs text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition"
              />
            </div>
          </div>

          <div className="bg-surface rounded-2xl shadow-soft divide-y divide-border overflow-hidden">
            {teachersQuery.isLoading &&
              [0, 1, 2].map((i) => (
                <div key={i} className="p-4 flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-surface-strong shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 rounded bg-surface-strong" />
                    <div className="h-2.5 w-1/2 rounded bg-surface-strong" />
                  </div>
                </div>
              ))}

            {!teachersQuery.isLoading &&
              filteredTeachers.map((teacher) => (
                <div key={teacher.id} className="p-4 flex items-center gap-3 hover:bg-surface-strong/50 transition">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarRamp(teacher.name)} flex items-center justify-center text-white text-sm font-semibold shrink-0`}
                  >
                    {teacher.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text truncate">{teacher.name}</p>
                    <p className="text-xs text-muted truncate">{teacher.email}</p>
                  </div>
                  <span className="text-xs text-muted-dark shrink-0 bg-surface-strong rounded-full px-2.5 py-1">
                    Joined {new Date(teacher.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}

            {!teachersQuery.isLoading && filteredTeachers.length === 0 && teachers.length > 0 && (
              <p className="text-sm text-muted p-6 text-center">No teachers match "{search}".</p>
            )}

            {!teachersQuery.isLoading && teachers.length === 0 && (
              <div className="p-8 text-center">
                <Users className="w-8 h-8 text-muted mx-auto mb-2" />
                <p className="text-sm text-muted">No teachers yet — add one on the left.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}