import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/axios';
import DashboardLayout from '../components/DashboardLayout';
import { studentSidebarSections } from '../config/studentSidebar';
import type { StudentAnnouncement } from '../types/insights';

export default function StudentAnnouncements() {
  const announcementsQuery = useQuery({
    queryKey: ['student-announcements'],
    queryFn: async () => (await api.get<StudentAnnouncement[]>('/student/announcements')).data,
  });

  return (
    <DashboardLayout sidebarSections={studentSidebarSections}>
      <h1 className="text-3xl font-bold text-text mb-1">Announcements</h1>
      <p className="text-muted mb-8">Updates from the teachers of your enrolled courses.</p>

      {announcementsQuery.isLoading && <p className="text-sm text-muted">Loading...</p>}
      {announcementsQuery.isError && <p className="text-sm text-red-500">Couldn't load announcements.</p>}

      {announcementsQuery.data?.length === 0 && (
        <p className="text-sm text-muted">No announcements yet.</p>
      )}

      <div className="max-w-2xl space-y-3">
        {announcementsQuery.data?.map((announcement) => (
          <div key={announcement.id} className="bg-surface rounded-2xl shadow-soft p-4">
            <div className="flex items-center justify-between gap-3 mb-1">
              <Link
                to={`/student/courses/${announcement.courseId}/learn`}
                className="text-[11px] font-semibold uppercase tracking-wider text-primary-600 hover:text-primary-700 truncate"
              >
                {announcement.courseTitle}
              </Link>
              <span className="text-[11px] text-muted shrink-0">
                {new Date(announcement.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
            <p className="text-sm font-semibold text-text">{announcement.title}</p>
            <p className="mt-1 text-sm text-text whitespace-pre-wrap">{announcement.message}</p>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}