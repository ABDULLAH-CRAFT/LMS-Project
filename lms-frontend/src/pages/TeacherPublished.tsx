import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { api } from '../lib/axios';
import type { Course } from '../types/course';
import DashboardLayout from '../components/DashboardLayout';
import CourseFormModal from '../components/CourseFormModal';
import { teacherSidebarSections } from '../config/teacherSidebar';

export default function TeacherPublished() {
  const [editingCourse, setEditingCourse] = useState<Course | null>(null); // course open in the edit modal

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
      <h1 className="text-3xl font-bold text-text mb-1">Published Courses</h1>
      <p className="text-muted mb-8">Live courses students can currently see and enroll in.</p>

      <div className="max-w-2xl">
        {coursesQuery.isLoading && <p className="text-sm text-muted">Loading...</p>}

        {publishedCourses?.map((course) => (
          <div key={course.id} className="bg-surface rounded-xl p-4 shadow-soft mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-medium text-text truncate">{course.title}</h3>
              <p className="text-xs text-secondary-600">₹{course.price} · published</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setEditingCourse(course)}
                title="Edit details"
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-primary-700 hover:bg-primary-100 transition"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <Link to={`/teacher/courses/${course.id}/edit`} className="text-xs text-muted hover:text-text transition px-1">
                Manage content
              </Link>
            </div>
          </div>
        ))}

        {publishedCourses?.length === 0 && (
          <p className="text-sm text-muted">Nothing published yet — publish a draft to see it here.</p>
        )}
      </div>

      {editingCourse && <CourseFormModal course={editingCourse} onClose={() => setEditingCourse(null)} />}
    </DashboardLayout>
  );
}