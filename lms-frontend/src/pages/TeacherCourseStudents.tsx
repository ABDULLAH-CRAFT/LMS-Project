import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import DashboardLayout from '../components/DashboardLayout';
import { teacherSidebarSections } from '../config/teacherSidebar';
import type { CourseStudentsResponse } from '../types/insights';

const inputClass =
  'w-full bg-surface-strong border border-border rounded-full pl-5 pr-5 py-2.5 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function getErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message ?? fallback;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface rounded-2xl shadow-soft p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-bold text-text mt-1">{value}</p>
    </div>
  );
}

export default function TeacherCourseStudents() {
  const { id: courseId } = useParams<{ id: string }>();
  const [search, setSearch] = useState('');

  const studentsQuery = useQuery({
    queryKey: ['course-students', courseId],
    queryFn: async () => (await api.get<CourseStudentsResponse>(`/courses/${courseId}/students`)).data,
    enabled: !!courseId,
  });

  const data = studentsQuery.data;

  const visibleStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = data?.students ?? [];
    if (!term) return list;
    return list.filter((s) => s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term));
  }, [data, search]);

  return (
    <DashboardLayout sidebarSections={teacherSidebarSections}>
      <Link
        to={`/teacher/courses/${courseId}/edit`}
        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
      >
        ← Back to course content
      </Link>
      <h1 className="text-3xl font-bold text-text mt-2 mb-1">Students</h1>
      <p className="text-muted mb-8">{data?.course.title ?? 'Enrolled students and their progress.'}</p>

      {studentsQuery.isLoading && <p className="text-sm text-muted">Loading students...</p>}
      {studentsQuery.isError && (
        <p className="text-sm text-red-500">{getErrorMessage(studentsQuery.error, "Couldn't load students.")}</p>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 max-w-3xl">
            <StatCard label="Enrolled students" value={String(data.summary.enrolledCount)} />
            <StatCard label="Average progress" value={`${data.summary.averageProgress}%`} />
            <StatCard label="Completed the course" value={String(data.summary.completedStudents)} />
          </div>

          <div className="max-w-md mb-4">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputClass}
            />
          </div>

          {data.students.length === 0 && (
            <p className="text-sm text-muted">No students have enrolled in this course yet.</p>
          )}

          {data.students.length > 0 && (
            <div className="bg-surface rounded-2xl shadow-soft overflow-hidden max-w-5xl">
              <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted border-b border-border">
                <span className="col-span-4">Student</span>
                <span className="col-span-2">Enrolled</span>
                <span className="col-span-3">Progress</span>
                <span className="col-span-2">Last activity</span>
                <span className="col-span-1 text-right">Lessons</span>
              </div>

              <div className="divide-y divide-border">
                {visibleStudents.map((student) => (
                  <div key={student.studentId} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-3 items-center">
                    <div className="md:col-span-4 min-w-0">
                      <p className="text-sm font-medium text-text truncate">{student.name}</p>
                      <p className="text-xs text-muted truncate">{student.email}</p>
                    </div>
                    <p className="md:col-span-2 text-xs text-muted">{formatDate(student.enrolledAt)}</p>
                    <div className="md:col-span-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-surface-strong overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary-600 to-secondary-400"
                            style={{ width: `${student.percent}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-text w-9 text-right">{student.percent}%</span>
                      </div>
                    </div>
                    <p className="md:col-span-2 text-xs text-muted">{formatDate(student.lastActivityAt)}</p>
                    <p className="md:col-span-1 text-xs text-muted md:text-right">
                      {student.completedCount}/{data.totalLessons}
                    </p>
                  </div>
                ))}

                {visibleStudents.length === 0 && (
                  <p className="px-5 py-6 text-sm text-muted">No students match "{search}".</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}