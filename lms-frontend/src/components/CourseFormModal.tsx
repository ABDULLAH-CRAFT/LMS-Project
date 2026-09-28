import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { api } from '../lib/axios';
import { createCourseSchema } from '../schemas/course.schema';
import type { Course } from '../types/course';

interface CourseFormModalProps {
  course?: Course | null; // pass a course to EDIT it; omit to CREATE a new one
  onClose: () => void;
}

type FieldErrors = Partial<Record<'title' | 'description' | 'price', string>>;

const inputClass =
  'w-full bg-surface-strong border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition';

export default function CourseFormModal({ course, onClose }: CourseFormModalProps) {
  const isEdit = !!course;
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    title: course?.title ?? '',
    description: course?.description ?? '',
    price: course ? String(course.price) : '0', // kept as a string so the field can be cleared while typing
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');

  // Escape closes the dialog
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const saveMutation = useMutation({
    mutationFn: async (values: { title: string; description: string; price: number }) => {
      const response = isEdit
        ? await api.patch<Course>(`/courses/${course!.id}`, values) // PATCH /courses/:id — owning teacher only
        : await api.post<Course>('/courses', values); // POST /courses — creates a draft
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-courses'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-overview'] });
      if (course) queryClient.invalidateQueries({ queryKey: ['course', course.id] });
      onClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message;
      setServerError(
        Array.isArray(message) ? message.join(', ') : message || 'Something went wrong. Please try again.',
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    // an empty price box would silently coerce to 0 (free) — make that an explicit choice
    if (form.price.trim() === '') {
      setErrors({ price: 'Enter a price (0 for free)' });
      return;
    }

    const result = createCourseSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FieldErrors;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    saveMutation.mutate(result.data);
  };

  // Rendered through a portal into <body>: DashboardLayout's content wrapper
  // creates its own stacking context (z-10) below the sidebar (z-20), so a
  // modal rendered in place would appear UNDER the sidebar.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose(); // click on the dimmed backdrop closes
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Edit course' : 'Create course'}
        className="w-full max-w-md bg-surface rounded-2xl shadow-soft-lg p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-text">{isEdit ? 'Edit course' : 'Create a new course'}</h2>
            <p className="text-xs text-muted mt-0.5">
              {isEdit
                ? 'Changes apply immediately, including on the student catalog.'
                : 'It starts as a draft — publish it when the content is ready.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-text hover:bg-surface-strong transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-muted block mb-1.5">TITLE</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Intro to React"
              autoFocus
              className={inputClass}
            />
            {errors.title && <p className="text-danger-600 text-xs mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted block mb-1.5">DESCRIPTION</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What will students learn?"
              rows={4}
              className={inputClass}
            />
            {errors.description && <p className="text-danger-600 text-xs mt-1">{errors.description}</p>}
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted block mb-1.5">PRICE (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className={inputClass}
            />
            {errors.price && <p className="text-danger-600 text-xs mt-1">{errors.price}</p>}
          </div>

          {serverError && (
            <p className="text-danger-600 text-xs bg-danger-50 border border-danger-100 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-surface-strong text-muted-dark rounded-xl py-2.5 text-sm font-medium hover:text-text transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex-1 bg-gradient-to-r from-primary-600 to-secondary-400 text-white rounded-xl py-2.5 text-sm font-semibold hover:scale-[1.01] transition disabled:opacity-50 shadow-primary-glow"
            >
              {saveMutation.isPending ? 'Saving...' : isEdit ? 'Save changes' : 'Create course'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}