import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import TeacherCourseCard from '../components/TeacherCourseCard';
import { teacherSidebarSections } from '../config/teacherSidebar';
import { useTeacherOverview } from '../hooks/useTeacherOverview';
import { cardClass, primaryButtonClass, secondaryButtonClass } from '../config/ui';

export default function TeacherPublished() {
  const overviewQuery = useTeacherOverview();
  const published = overviewQuery.data?.courses.filter((c) => c.status === 'published');

  return (
    <DashboardLayout sidebarSections={teacherSidebarSections}>
      <h1 className="text-3xl font-bold text-text mb-1">Published Courses</h1>
      <p className="text-muted mb-8">Live courses students can currently see and enroll in.</p>

      {overviewQuery.isLoading && <p className="text-sm text-muted">Loading…</p>}

      {published && published.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {published.map((course, index) => (
            <TeacherCourseCard key={course.id} course={course} index={index}>
              <Link to={`/teacher/courses/${course.id}/edit`} className={`${primaryButtonClass} flex-1 !px-3 !py-2 !text-xs`}>
                Manage content
              </Link>
              <Link to={`/courses/${course.id}`} className={`${secondaryButtonClass} flex-1 !px-3 !py-2 !text-xs`}>
                <Eye className="w-3.5 h-3.5" /> Preview
              </Link>
            </TeacherCourseCard>
          ))}
        </div>
      )}

      {published?.length === 0 && (
        <div className={`${cardClass} p-12 text-center max-w-xl`}>
          <p className="text-text font-medium mb-1">Nothing published yet</p>
          <p className="text-sm text-muted mb-4">Publish a draft and it will show up here.</p>
          <Link to="/teacher/drafts" className={secondaryButtonClass}>Go to drafts</Link>
        </div>
      )}
    </DashboardLayout>
  );
}
