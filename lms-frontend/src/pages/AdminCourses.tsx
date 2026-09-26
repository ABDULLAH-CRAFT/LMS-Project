// lms-frontend/src/pages/AdminCourses.tsx
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Search, CircleDot, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/axios';
import DashboardLayout from '../components/DashboardLayout';
import { adminSidebarSections } from '../config/adminSidebar';
import type { Course } from '../types/course';

// What GET /admin/courses returns — a normal Course plus the teacher who
// created it (name/email only, never the password hash).
interface AdminCourse extends Course {
  teacher: { id: string; name: string; email: string } | null;
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

export default function AdminCourses() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  const coursesQuery = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const response = await api.get<AdminCourse[]>('/admin/courses');
      return response.data;
    },
  });

  const courses = coursesQuery.data ?? [];

  const { totalCourses, publishedCount, draftCount } = useMemo(
    () => ({
      totalCourses: courses.length,
      publishedCount: courses.filter((c) => c.status === 'published').length,
      draftCount: courses.filter((c) => c.status === 'draft').length,
    }),
    [courses],
  );

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
      if (!matchesStatus) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        course.title.toLowerCase().includes(q) ||
        course.teacher?.name.toLowerCase().includes(q) ||
        course.teacher?.email.toLowerCase().includes(q)
      );
    });
  }, [courses, search, statusFilter]);

  return (
    <DashboardLayout sidebarSections={adminSidebarSections}>
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-600 to-secondary-400 flex items-center justify-center shadow-primary-glow">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-text">Courses</h1>
      </div>
      <p className="text-muted mb-8">Every course on the platform, and who created it.</p>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 max-w-3xl">
        <div className="bg-surface rounded-2xl shadow-soft p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-primary-700" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-text leading-none">{totalCourses}</p>
            <p className="text-xs text-muted-dark mt-1">Total courses</p>
          </div>
        </div>

        <button
          onClick={() => setStatusFilter(statusFilter === 'published' ? 'all' : 'published')}
          className={[
            'bg-surface rounded-2xl shadow-soft p-5 flex items-center gap-4 text-left transition',
            statusFilter === 'published' ? 'ring-2 ring-secondary-500/50' : '',
          ].join(' ')}
        >
          <div className="w-11 h-11 rounded-full bg-secondary-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-secondary-600" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-text leading-none">{publishedCount}</p>
            <p className="text-xs text-muted-dark mt-1">Published</p>
          </div>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'draft' ? 'all' : 'draft')}
          className={[
            'bg-surface rounded-2xl shadow-soft p-5 flex items-center gap-4 text-left transition',
            statusFilter === 'draft' ? 'ring-2 ring-tertiary-500/50' : '',
          ].join(' ')}
        >
          <div className="w-11 h-11 rounded-full bg-tertiary-100 flex items-center justify-center shrink-0">
            <CircleDot className="w-5 h-5 text-tertiary-600" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-text leading-none">{draftCount}</p>
            <p className="text-xs text-muted-dark mt-1">Drafts</p>
          </div>
        </button>
      </div>

      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-3 gap-3">
          <h2 className="font-semibold text-text">
            {statusFilter === 'all' ? 'All courses' : statusFilter === 'published' ? 'Published courses' : 'Draft courses'}
          </h2>
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title or teacher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-strong border border-border rounded-full pl-8 pr-3 py-1.5 text-xs text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition"
            />
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-soft divide-y divide-border overflow-hidden">
          {coursesQuery.isLoading &&
            [0, 1, 2].map((i) => (
              <div key={i} className="p-4 flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-surface-strong shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-surface-strong" />
                  <div className="h-2.5 w-1/4 rounded bg-surface-strong" />
                </div>
              </div>
            ))}

          {!coursesQuery.isLoading &&
            filteredCourses.map((course) => (
              <div key={course.id} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-secondary-500 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-white">{course.title.charAt(0).toUpperCase()}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text truncate">{course.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {course.teacher ? (
                      <>
                        <div
                          className={`w-4 h-4 rounded-full bg-gradient-to-br ${avatarRamp(course.teacher.name)} flex items-center justify-center text-[9px] font-bold text-white shrink-0`}
                        >
                          {course.teacher.name.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-xs text-muted truncate">{course.teacher.name}</p>
                      </>
                    ) : (
                      <p className="text-xs text-muted italic">Teacher no longer exists</p>
                    )}
                  </div>
                </div>

                <span
                  className={[
                    'text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0',
                    course.status === 'published'
                      ? 'bg-secondary-100 text-secondary-700'
                      : 'bg-tertiary-100 text-tertiary-700',
                  ].join(' ')}
                >
                  {course.status === 'published' ? 'Published' : 'Draft'}
                </span>

                <span className="text-sm font-semibold text-text shrink-0 w-16 text-right">
                  {Number(course.price) <= 0 ? 'Free' : `₹${course.price}`}
                </span>
              </div>
            ))}

          {!coursesQuery.isLoading && filteredCourses.length === 0 && courses.length > 0 && (
            <p className="text-sm text-muted p-6 text-center">No courses match your filters.</p>
          )}

          {!coursesQuery.isLoading && courses.length === 0 && (
            <div className="p-8 text-center">
              <BookOpen className="w-8 h-8 text-muted mx-auto mb-2" />
              <p className="text-sm text-muted">No courses on the platform yet.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}