import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/axios';
import { createCourseSchema, type CreateCourseFormValues } from '../schemas/course.schema';
import type { Course } from '../types/course';
import DashboardLayout from '../components/DashboardLayout';
import { teacherSidebarSections } from '../config/teacherSidebar';

export default function TeacherDrafts() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateCourseFormValues>({ title: '', description: '', price: 0 });
  const [errors, setErrors] = useState<Partial<Record<keyof CreateCourseFormValues, string>>>({});

  const coursesQuery = useQuery({
    queryKey: ['my-courses'],
    queryFn: async () => {
      const response = await api.get<Course[]>('/courses/mine');
      return response.data;
    },
  });

  const draftCourses = coursesQuery.data?.filter((c) => c.status === 'draft');

  const createMutation = useMutation({
    mutationFn: async (data: CreateCourseFormValues) => {
      const response = await api.post<Course>('/courses', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-courses'] });
      setFormData({ title: '', description: '', price: 0 });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const response = await api.patch<Course>(`/courses/${courseId}/publish`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-courses'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = createCourseSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof CreateCourseFormValues;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    createMutation.mutate(result.data);
  };

  return (
    <DashboardLayout sidebarSections={teacherSidebarSections}>
      <h1 className="text-3xl font-bold text-white mb-1">Draft Courses</h1> {/* CHANGED — white heading */}
      <p className="text-gray-500 mb-8">Unpublished courses only you can see. Publish when ready.</p>

      <form onSubmit={handleSubmit} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl mb-8 max-w-lg"> {/* CHANGED — glass form card */}
        <h2 className="font-medium text-white mb-4">Create a new course</h2> {/* CHANGED — white subheading */}
        <input
          type="text"
          placeholder="Course title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition mb-1" // CHANGED — glass input
        />
        {errors.title && <p className="text-red-400 text-xs mb-2">{errors.title}</p>} {/* CHANGED — lighter red */}

        <textarea
          placeholder="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition mb-1 mt-2"
          rows={3}
        />
        {errors.description && <p className="text-red-400 text-xs mb-2">{errors.description}</p>}

        <input
          type="number"
          placeholder="Price"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition mb-1 mt-2"
          step="0.01"
        />
        {errors.price && <p className="text-red-400 text-xs mb-2">{errors.price}</p>}

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full bg-gradient-to-r from-purple-600 to-cyan-400 text-white rounded-lg py-2 text-sm font-semibold mt-3 hover:scale-[1.01] transition disabled:opacity-50" // CHANGED — gradient button
        >
          {createMutation.isPending ? 'Creating...' : 'Create Course'}
        </button>
      </form>

      <div className="max-w-lg">
        {coursesQuery.isLoading && <p className="text-sm text-gray-500">Loading...</p>}

        {draftCourses?.map((course) => (
          <div key={course.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 backdrop-blur-xl mb-3 flex items-center justify-between"> {/* CHANGED — glass row */}
            <div>
              <h3 className="font-medium text-white">{course.title}</h3> {/* CHANGED — white title */}
              <p className="text-xs text-amber-400">${course.price} · draft</p> {/* CHANGED — brighter amber for dark bg */}
            </div>
            <div className="flex items-center gap-2">
              <Link to={`/teacher/courses/${course.id}/edit`} className="text-xs text-gray-500 hover:text-white transition"> {/* CHANGED — dark-theme hover */}
                Manage content
              </Link>
              <button
                onClick={() => publishMutation.mutate(course.id)}
                disabled={publishMutation.isPending}
                className="text-xs bg-gradient-to-r from-purple-600 to-cyan-400 text-white px-3 py-1.5 rounded-full disabled:opacity-50" // CHANGED — gradient button
              >
                Publish
              </button>
            </div>
          </div>
        ))}

        {draftCourses?.length === 0 && (
          <p className="text-sm text-gray-500">No drafts — everything you've created is published.</p>
        )}
      </div>
    </DashboardLayout>
  );
}