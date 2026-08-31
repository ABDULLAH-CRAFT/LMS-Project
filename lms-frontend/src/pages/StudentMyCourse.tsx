import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { Enrollment } from '../types/enrollment';
import DashboardLayout from '../components/DashboardLayout';
import CourseCard from '../components/CourseCard';
import CourseGridSkeleton from '../components/CourseGridSkeleton';
import { studentSidebarSections } from '../config/studentSidebar';

export default function StudentMyCourses() {
  const enrollmentsQuery = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: async () => {
      const response = await api.get<Enrollment[]>('/enrollments/mine');
      return response.data;
    },
  });

  return (
    <DashboardLayout sidebarSections={studentSidebarSections}>
      <h1 className="text-3xl font-bold text-white mb-1">My Courses</h1> {/* CHANGED — white heading */}
      <p className="text-gray-500 mb-8">Courses you're currently enrolled in.</p>

      {enrollmentsQuery.isLoading && <CourseGridSkeleton />}

      {!enrollmentsQuery.isLoading && enrollmentsQuery.data?.length === 0 && (
        <div className="text-center py-20">
          <p className="text-white font-medium mb-1">You haven't enrolled in any courses yet</p> {/* CHANGED — white text */}
          <Link to="/student" className="text-sm text-purple-400 font-medium hover:text-purple-300"> {/* CHANGED — purple link matching theme */}
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
                <p className="text-xs text-gray-500">Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}</p> // CHANGED — muted gray
              }
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}