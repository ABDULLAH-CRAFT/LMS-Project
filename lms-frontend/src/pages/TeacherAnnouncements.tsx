import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { api } from '../lib/axios';
import DashboardLayout from '../components/DashboardLayout';
import { teacherSidebarSections } from '../config/teacherSidebar';
import type { Course } from '../types/course';
import type { CourseAnnouncement } from '../types/insights';

const inputClass =
  'w-full bg-surface-strong border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition';

function getErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message ?? fallback;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function TeacherAnnouncements() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  // same query key as TeacherPublished, so it is shared from cache
  const coursesQuery = useQuery({
    queryKey: ['my-courses'],
    queryFn: async () => (await api.get<Course[]>('/courses/mine')).data,
  });

  const publishedCourses = (coursesQuery.data ?? []).filter((c) => c.status === 'published');
  const courseId = searchParams.get('course') ?? publishedCourses[0]?.id ?? null;

  const announcementsQuery = useQuery({
    queryKey: ['announcements', courseId],
    queryFn: async () => (await api.get<CourseAnnouncement[]>(`/courses/${courseId}/announcements`)).data,
    enabled: !!courseId,
  });

  const postMutation = useMutation({
    mutationFn: async () =>
      (await api.post<CourseAnnouncement>(`/courses/${courseId}/announcements`, {
        title: title.trim(),
        message: message.trim(),
      })).data,
    onSuccess: () => {
      setTitle('');
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['announcements', courseId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (announcementId: string) =>
      (await api.delete(`/courses/${courseId}/announcements/${announcementId}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements', courseId] }),
  });

  const canPost = !!courseId && title.trim().length >= 3 && message.trim().length >= 1;

  return (
    <DashboardLayout sidebarSections={teacherSidebarSections}>
      <h1 className="text-3xl font-bold text-text mb-1">Announcements</h1>
      <p className="text-muted mb-8">Post updates to the students enrolled in one of your published courses.</p>

      {coursesQuery.isLoading && <p className="text-sm text-muted">Loading your courses...</p>}

      {!coursesQuery.isLoading && publishedCourses.length === 0 && (
        <p className="text-sm text-muted">Publish a course first — announcements are sent to enrolled students.</p>
      )}

      {publishedCourses.length > 0 && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-surface rounded-2xl shadow-soft p-5 space-y-3">
            <label className="block text-xs text-muted">
              Course
              <select
                value={courseId ?? ''}
                onChange={(e) => setSearchParams({ course: e.target.value })}
                className={`${inputClass} mt-1`}
              >
                {publishedCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>

            <input
              type="text"
              placeholder="Title"
              value={title}
              maxLength={150}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
            <textarea
              placeholder="Write your announcement..."
              value={message}
              maxLength={5000}
              rows={4}
              onChange={(e) => setMessage(e.target.value)}
              className={inputClass}
            />

            {postMutation.isError && (
              <p className="text-xs text-red-500">{getErrorMessage(postMutation.error, 'Could not post the announcement.')}</p>
            )}
            {postMutation.isSuccess && <p className="text-xs text-secondary-600">Posted.</p>}

            <button
              onClick={() => postMutation.mutate()}
              disabled={postMutation.isPending || !canPost}
              className="bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-5 py-2 rounded-full text-xs font-semibold disabled:opacity-50"
            >
              {postMutation.isPending ? 'Posting...' : 'Post announcement'}
            </button>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-text mb-3">Previous announcements</h2>
            {announcementsQuery.isLoading && <p className="text-sm text-muted">Loading...</p>}
            {announcementsQuery.isError && (
              <p className="text-sm text-red-500">Couldn't load announcements.</p>
            )}
            {announcementsQuery.data?.length === 0 && (
              <p className="text-sm text-muted">Nothing posted for this course yet.</p>
            )}

            <div className="space-y-3">
              {announcementsQuery.data?.map((announcement) => (
                <div key={announcement.id} className="bg-surface rounded-2xl shadow-soft p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text">{announcement.title}</p>
                      <p className="text-[11px] text-muted mt-0.5">{formatDate(announcement.createdAt)}</p>
                    </div>
                    <button
                      type="button"
                      title="Delete announcement"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (window.confirm(`Delete "${announcement.title}"?`)) deleteMutation.mutate(announcement.id);
                      }}
                      className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-500/10 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-text whitespace-pre-wrap">{announcement.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}