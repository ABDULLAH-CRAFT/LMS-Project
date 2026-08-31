import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { Course } from '../types/course';
import DashboardLayout from '../components/DashboardLayout';
import CourseCard from '../components/CourseCard';
import CourseGridSkeleton from '../components/CourseGridSkeleton';
import { studentSidebarSections } from '../config/studentSidebar';
import { useCurrentUser } from '../hooks/useCurrentUser';

export default function StudentDashboard() {
  const [search, setSearch] = useState('');
  const { data: user } = useCurrentUser(); // real logged-in student's data, for the greeting

  const coursesQuery = useQuery({
    queryKey: ['published-courses'],
    queryFn: async () => {
      const response = await api.get<Course[]>('/courses');
      return response.data;
    },
  });

  const filteredCourses = coursesQuery.data?.filter((course) =>
    course.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <DashboardLayout sidebarSections={studentSidebarSections}>
      <h1 className="text-3xl font-bold text-white mb-1"> {/* CHANGED — white heading for dark bg */}
        Welcome back{user ? `, ${user.name}` : ''}
      </h1>
      <p className="text-gray-500 mb-8">Pick up where you left off, or find something new to learn.</p> {/* CHANGED — muted gray */}

      <div className="relative max-w-md mb-10">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"> {/* CHANGED — darker icon tone */}
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search courses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-full pl-11 pr-5 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition" // CHANGED — glass input matching auth pages
        />
      </div>

      {coursesQuery.isLoading && <CourseGridSkeleton />}

      {!coursesQuery.isLoading && filteredCourses?.length === 0 && (
        <div className="text-center py-20">
          <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4"> {/* CHANGED — glass circle */}
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-white font-medium mb-1">{search ? 'No courses match your search' : 'No courses yet'}</p> {/* CHANGED — white text */}
          <p className="text-sm text-gray-500">{search ? 'Try a different keyword.' : 'Check back soon — new courses are added regularly.'}</p>
        </div>
      )}

      {!coursesQuery.isLoading && filteredCourses && filteredCourses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course, index) => (
            <CourseCard
              key={course.id}
              course={course}
              index={index}
              footer={
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">${course.price}</span> {/* CHANGED — white price */}
                  <span className="text-xs font-medium text-gray-500 group-hover:text-purple-300 transition">View course →</span> {/* CHANGED — purple on hover */}
                </div>
              }
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}