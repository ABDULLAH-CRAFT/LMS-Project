import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FilePlus2, Loader2, Plus, Rocket, X } from 'lucide-react';
import { api } from '../lib/axios';
import { getApiErrorMessage } from '../lib/errors';
import { createCourseSchema } from '../schemas/course.schema';
import type { Course } from '../types/course';
import DashboardLayout from '../components/DashboardLayout';
import CoverUploader from '../components/CoverUploader';
import TeacherCourseCard from '../components/TeacherCourseCard';
import { teacherSidebarSections } from '../config/teacherSidebar';
import { TEACHER_OVERVIEW_KEY, useTeacherOverview } from '../hooks/useTeacherOverview';
import { cardClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from '../config/ui';

export default function TeacherDrafts() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const showForm = searchParams.get('new') === '1'; // the dashboard's "New course" buttons link here with ?new=1
  const setShowForm = (open: boolean) => setSearchParams(open ? { new: '1' } : {}, { replace: true });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(''); // kept as text so the field can be empty; converted on submit
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const overviewQuery = useTeacherOverview();
  const drafts = overviewQuery.data?.courses.filter((c) => c.status === 'draft');

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; price: number; coverImageUrl?: string }) => {
      const response = await api.post<Course>('/courses', data);
      return response.data;
    },
    onSuccess: (course) => {
      queryClient.invalidateQueries({ queryKey: TEACHER_OVERVIEW_KEY });
      navigate(`/teacher/courses/${course.id}/edit`); // straight into the builder so they can add lessons
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const response = await api.patch<Course>(`/courses/${courseId}/publish`);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEACHER_OVERVIEW_KEY }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = createCourseSchema.safeParse({ title, description, price: price === '' ? 0 : price });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[String(issue.path[0])] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    createMutation.mutate({ ...result.data, ...(coverUrl ? { coverImageUrl: coverUrl } : {}) });
  };

  const createError = createMutation.isError ? getApiErrorMessage(createMutation.error, 'Could not create the course. Please try again.') : null;

  return (
    <DashboardLayout sidebarSections={teacherSidebarSections}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text mb-1">Draft Courses</h1>
          <p className="text-muted">Unpublished courses only you can see. Publish when ready.</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className={primaryButtonClass}>
            <Plus className="w-4 h-4" /> New course
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className={`${cardClass} p-6 mb-8 max-w-4xl`}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-text flex items-center gap-2">
              <FilePlus2 className="w-4 h-4 text-primary-600" /> Create a new course
            </h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-muted hover:text-text transition" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="md:col-span-3 space-y-4">
              <div>
                <label className={labelClass}>Course title</label>
                <input
                  type="text"
                  placeholder="e.g. Intro to React"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                />
                {errors.title && <p className="text-danger-600 text-xs mt-1">{errors.title}</p>}
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  placeholder="What will students learn?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className={inputClass}
                />
                {errors.description && <p className="text-danger-600 text-xs mt-1">{errors.description}</p>}
              </div>
              <div>
                <label className={labelClass}>Price (0 = free)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={inputClass}
                />
                {errors.price && <p className="text-danger-600 text-xs mt-1">{errors.price}</p>}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>
                Cover image <span className="font-normal text-muted">(optional)</span>
              </label>
              <CoverUploader value={coverUrl} onChange={setCoverUrl} onBusyChange={setCoverBusy} />
            </div>
          </div>

          {createError && <p className="text-danger-600 text-xs mt-4">{createError}</p>}

          <div className="flex items-center gap-3 mt-6">
            <button type="submit" disabled={createMutation.isPending || coverBusy} className={primaryButtonClass}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {createMutation.isPending ? 'Creating…' : coverBusy ? 'Uploading cover…' : 'Create & add content'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className={secondaryButtonClass}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {overviewQuery.isLoading && <p className="text-sm text-muted">Loading…</p>}

      {drafts && drafts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {drafts.map((course, index) => {
            const empty = course.lessonCount === 0;
            return (
              <TeacherCourseCard key={course.id} course={course} index={index}>
                <Link to={`/teacher/courses/${course.id}/edit`} className={`${secondaryButtonClass} flex-1 !px-3 !py-2 !text-xs`}>
                  Manage content
                </Link>
                <button
                  onClick={() => publishMutation.mutate(course.id)}
                  disabled={empty || publishMutation.isPending}
                  title={empty ? 'Add at least one lesson before publishing' : 'Make this course visible to students'}
                  className={`${primaryButtonClass} flex-1 !px-3 !py-2 !text-xs`}
                >
                  <Rocket className="w-3.5 h-3.5" /> Publish
                </button>
              </TeacherCourseCard>
            );
          })}
        </div>
      )}

      {drafts?.length === 0 && !showForm && (
        <div className={`${cardClass} p-12 text-center max-w-xl`}>
          <p className="text-text font-medium mb-1">No drafts right now</p>
          <p className="text-sm text-muted">Everything you've created is published — or you haven't started a course yet.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
