import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { api } from '../lib/axios';
import { createCourseSchema, type CreateCourseFormValues } from '../schemas/course.schema';
import type { Course } from '../types/course';
import DashboardLayout from '../components/DashboardLayout';
import CourseFormModal from '../components/CourseFormModal';
import { teacherSidebarSections } from '../config/teacherSidebar';

export default function TeacherDrafts() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateCourseFormValues>({ title: '', description: '', price: 0 });
  const [errors, setErrors] = useState<Partial<Record<keyof CreateCourseFormValues, string>>>({});

  const [editingCourse, setEditingCourse] = useState<Course | null>(null); // course open in the edit modal
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null); // row showing the "delete?" confirm
  const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(null);
  const [publishError, setPublishError] = useState<{ id: string; message: string } | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ['teacher-overview'] });
      setFormData({ title: '', description: '', price: 0 });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const response = await api.patch<Course>(`/courses/${courseId}/publish`);
      return response.data;
    },
    onSuccess: () => {
      setPublishError(null);
      queryClient.invalidateQueries({ queryKey: ['my-courses'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-overview'] });
    },
    onError: (error: any, courseId) => {
      setPublishError({
        id: courseId,
        message: error.response?.data?.message || 'Failed to publish course',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const response = await api.delete(`/courses/${courseId}`); // DELETE /courses/:id — backend only allows drafts
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-courses'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-overview'] });
      setConfirmDeleteId(null);
      setDeleteError(null);
    },
    onError: (error: any, courseId) => {
      setDeleteError({
        id: courseId,
        message: error.response?.data?.message || 'Failed to delete course',
      });
      setConfirmDeleteId(null);
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
      <h1 className="text-3xl font-bold text-text mb-1">Draft Courses</h1>
      <p className="text-muted mb-8">Unpublished courses only you can see. Publish when ready.</p>

      <form onSubmit={handleSubmit} className="bg-surface rounded-2xl p-6 shadow-soft mb-8 max-w-lg">
        <h2 className="font-medium text-text mb-4">Create a new course</h2>
        <input
          type="text"
          placeholder="Course title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full bg-surface-strong border border-border rounded-lg px-4 py-2 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition mb-1"
        />
        {errors.title && <p className="text-danger-600 text-xs mb-2">{errors.title}</p>}

        <textarea
          placeholder="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full bg-surface-strong border border-border rounded-lg px-4 py-2 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition mb-1 mt-2"
          rows={3}
        />
        {errors.description && <p className="text-danger-600 text-xs mb-2">{errors.description}</p>}

        <input
          type="number"
          placeholder="Price"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
          className="w-full bg-surface-strong border border-border rounded-lg px-4 py-2 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition mb-1 mt-2"
          step="0.01"
        />
        {errors.price && <p className="text-danger-600 text-xs mb-2">{errors.price}</p>}

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full bg-gradient-to-r from-primary-600 to-secondary-400 text-white rounded-lg py-2 text-sm font-semibold mt-3 hover:scale-[1.01] transition disabled:opacity-50"
        >
          {createMutation.isPending ? 'Creating...' : 'Create Course'}
        </button>
      </form>

      <div className="max-w-2xl">
        {coursesQuery.isLoading && <p className="text-sm text-muted">Loading...</p>}

        {draftCourses?.map((course) => {
          const isConfirming = confirmDeleteId === course.id;
          const rowError = deleteError?.id === course.id ? deleteError.message : null;
          const isDeletingThis = deleteMutation.isPending && deleteMutation.variables === course.id;

          return (
            <div key={course.id} className="bg-surface rounded-xl shadow-soft mb-3">
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-medium text-text truncate">{course.title}</h3>
                  <p className="text-xs text-tertiary-600">₹{course.price} · draft</p>
                </div>

                {!isConfirming ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingCourse(course)}
                      title="Edit details"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-primary-700 hover:bg-primary-100 transition"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <Link
                      to={`/teacher/courses/${course.id}/edit`}
                      className="text-xs text-muted hover:text-text transition px-1"
                    >
                      Manage content
                    </Link>
                    <button
                      type="button"
                        onClick={() => {
                        setPublishError(null);
                        publishMutation.mutate(course.id);
                      }}
                      disabled={publishMutation.isPending}
                      className="text-xs bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-3 py-1.5 rounded-full disabled:opacity-50"
                    >
                      Publish
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setConfirmDeleteId(course.id);
                      }}
                      title="Delete draft"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-danger-600 hover:bg-danger-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-danger-600">Delete this draft?</span>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(course.id)}
                      disabled={isDeletingThis}
                      title="Confirm delete"
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-danger-600 text-white hover:bg-danger-700 transition disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={isDeletingThis}
                      title="Cancel"
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-strong text-muted hover:text-text transition disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {rowError && <p className="text-danger-600 text-xs px-4 pb-3 -mt-1">{rowError}</p>}
              {publishError?.id === course.id && (
                <p className="text-danger-600 text-xs px-4 pb-3 -mt-1">{publishError.message}</p>
              )}
            </div>
          );
        })}

        {draftCourses?.length === 0 && (
          <p className="text-sm text-muted">No drafts — everything you've created is published.</p>
        )}
      </div>

      {editingCourse && <CourseFormModal course={editingCourse} onClose={() => setEditingCourse(null)} />}
    </DashboardLayout>
  );
}