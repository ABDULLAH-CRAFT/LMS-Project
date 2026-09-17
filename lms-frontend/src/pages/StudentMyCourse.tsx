import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { Enrollment } from '../types/enrollment';
import DashboardLayout from '../components/DashboardLayout';
import CourseCard from '../components/CourseCard';
import CourseGridSkeleton from '../components/CourseGridSkeleton';
import { studentSidebarSections } from '../config/studentSidebar';

export default function StudentMyCourses() {
  const navigate = useNavigate();

  const enrollmentsQuery = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: async () => {
      const response = await api.get<Enrollment[]>('/enrollments/mine');
      return response.data;
    },
  });

  return (
    <DashboardLayout sidebarSections={studentSidebarSections}>
      <h1 className="text-3xl font-bold text-text mb-1">My Courses</h1>
      <p className="text-muted mb-8">Courses you're currently enrolled in.</p>

      {enrollmentsQuery.isLoading && <CourseGridSkeleton />}

      {!enrollmentsQuery.isLoading && enrollmentsQuery.data?.length === 0 && (
        <div className="text-center py-20">
          <p className="text-text font-medium mb-1">You haven't enrolled in any courses yet</p>
          <Link to="/student" className="text-sm text-primary-600 font-medium hover:text-primary-700">
            Browse the catalog →
          </Link>
        </div>
      )}

      {!enrollmentsQuery.isLoading && enrollmentsQuery.data && enrollmentsQuery.data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollmentsQuery.data.map((enrollment, index) => (
            <CourseCard
              key={enrollment.id}
              course={enrollment.course}
              index={index}
              footer={
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted">Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}</p>
                  {/* NEW — nested button (not a Link) so we don't nest an <a> inside CourseCard's outer <Link> */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/student/courses/${enrollment.course.id}/learn`);
                    }}
                    className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition"
                  >
                    Continue learning →
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}