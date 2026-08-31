import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { Course } from '../types/course';
import DashboardLayout from '../components/DashboardLayout';
import { teacherSidebarSections } from '../config/teacherSidebar';

export default function TeacherPublished() {
  const coursesQuery = useQuery({
    queryKey: ['my-courses'],
    queryFn: async () => {
      const response = await api.get<Course[]>('/courses/mine');
      return response.data;
    },
  });

  const publishedCourses = coursesQuery.data?.filter((c) => c.status === 'published');

  return (
    <DashboardLayout sidebarSections={teacherSidebarSections}>
      <h1 className="text-3xl font-bold text-white mb-1">Published Courses</h1> {/* CHANGED — white heading */}
      <p className="text-gray-500 mb-8">Live courses students can currently see and enroll in.</p>

      <div className="max-w-lg">
        {coursesQuery.isLoading && <p className="text-sm text-gray-500">Loading...</p>}

        {publishedCourses?.map((course) => (
          <div key={course.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 backdrop-blur-xl mb-3 flex items-center justify-between"> {/* CHANGED — glass row */}
            <div>
              <h3 className="font-medium text-white">{course.title}</h3> {/* CHANGED — white title */}
              <p className="text-xs text-green-400">${course.price} · published</p> {/* CHANGED — brighter green */}
            </div>
            <Link to={`/teacher/courses/${course.id}/edit`} className="text-xs text-gray-500 hover:text-white transition"> {/* CHANGED — dark-theme hover */}
              Manage content
            </Link>
          </div>
        ))}

        {publishedCourses?.length === 0 && (
          <p className="text-sm text-gray-500">Nothing published yet — publish a draft to see it here.</p>
        )}
      </div>
    </DashboardLayout>
  );
}