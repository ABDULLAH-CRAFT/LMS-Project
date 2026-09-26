import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CircleCheck, Circle, ChevronDown, FileText, Layers, Loader2, Play, Plus, Rocket, Eye, Users, Video, X,
} from 'lucide-react';
import { api } from '../lib/axios';
import { getApiErrorMessage as errorText } from '../lib/errors';
import type { Course } from '../types/course';
import type { CourseModuleWithLessons, Lesson } from '../types/courseContent';
import DashboardLayout from '../components/DashboardLayout';
import CoverUploader from '../components/CoverUploader';
import VideoUploader from '../components/VideoUploader';
import LessonVideo from '../components/LessonVideo';
import { teacherSidebarSections } from '../config/teacherSidebar';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { TEACHER_OVERVIEW_KEY, useTeacherOverview } from '../hooks/useTeacherOverview';
import { cardClass, chipClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from '../config/ui';

/* ------------------------------------------------------------------ */
/* Right column: cover image + course details + publish checklist      */
/* ------------------------------------------------------------------ */
function CourseDetailsPanel({ course, moduleCount, lessonCount }: { course: Course; moduleCount: number; lessonCount: number }) {
  const queryClient = useQueryClient();
  // Local form state, seeded once from the loaded course (this component only mounts after the course has loaded)
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);
  const [price, setPrice] = useState(String(Number(course.price)));

  const updateMutation = useMutation({
    mutationFn: async (changes: Partial<Pick<Course, 'title' | 'description' | 'price'>> & { coverImageUrl?: string | null }) => {
      const response = await api.patch<Course>(`/courses/${course.id}`, changes);
      return response.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['course', course.id], updated); // the response IS the full updated course, so no refetch needed
      queryClient.invalidateQueries({ queryKey: TEACHER_OVERVIEW_KEY });
    },
  });

  const dirty =
    title !== course.title || description !== course.description || Number(price) !== Number(course.price);
  const valid = title.trim().length >= 3 && description.trim().length >= 10 && price !== '' && Number(price) >= 0;

  const checklist = [
    { done: moduleCount > 0, label: 'Add at least one module' },
    { done: lessonCount > 0, label: 'Add at least one lesson' },
    { done: !!course.coverImageUrl, label: 'Add a cover image', optional: true },
  ];

  return (
    <div className="space-y-6 lg:sticky lg:top-24">
      <section className={`${cardClass} p-5`}>
        <h2 className="font-semibold text-text mb-3">Cover image</h2>
        <CoverUploader
          value={course.coverImageUrl}
          onChange={(url) => updateMutation.mutate({ coverImageUrl: url })} // saves immediately — no extra "save" click for the cover
          disabled={updateMutation.isPending}
        />
      </section>

      <section className={`${cardClass} p-5`}>
        <h2 className="font-semibold text-text mb-4">Course details</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Price (0 = free)</label>
            <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
          </div>
        </div>

        {updateMutation.isError && <p className="text-danger-600 text-xs mt-3">{errorText(updateMutation.error)}</p>}
        {updateMutation.isSuccess && !dirty && <p className="text-secondary-600 text-xs mt-3 flex items-center gap-1"><CircleCheck className="w-3.5 h-3.5" /> Saved</p>}

        <button
          onClick={() => updateMutation.mutate({ title: title.trim(), description: description.trim(), price: Number(price) })}
          disabled={!dirty || !valid || updateMutation.isPending}
          className={`${primaryButtonClass} w-full mt-4`}
        >
          {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Save changes
        </button>
      </section>

      {course.status === 'draft' && (
        <section className={`${cardClass} p-5`}>
          <h2 className="font-semibold text-text mb-3">Before you publish</h2>
          <ul className="space-y-2">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-sm">
                {item.done ? <CircleCheck className="w-4 h-4 text-secondary-500" /> : <Circle className="w-4 h-4 text-border-strong" />}
                <span className={item.done ? 'text-muted line-through' : 'text-text'}>{item.label}</span>
                {item.optional && !item.done && <span className="text-[10px] text-muted">(optional)</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* "Add lesson" form (text or video) that opens inside a module card   */
/* ------------------------------------------------------------------ */
function AddLessonPanel({ courseId, moduleId, onClose }: { courseId: string; moduleId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<'text' | 'video'>('video');
  const [content, setContent] = useState('');
  const [videoBusy, setVideoBusy] = useState(false); // true while a video file is uploading

  const addLessonMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/courses/${courseId}/modules/${moduleId}/lessons`, {
        title: title.trim(),
        contentType,
        content: content.trim(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum', courseId] });
      queryClient.invalidateQueries({ queryKey: TEACHER_OVERVIEW_KEY }); // lesson counts changed
      onClose();
    },
  });

  const canSave = title.trim().length >= 3 && content.trim().length > 0 && !videoBusy && !addLessonMutation.isPending;

  const typeButton = (type: 'text' | 'video', label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => {
        setContentType(type);
        setContent(''); // switching type clears the content so text never ends up in a video lesson
      }}
      disabled={videoBusy}
      className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
        contentType === type ? 'bg-surface text-primary-700 shadow-soft' : 'text-muted hover:text-text'
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="mt-4 rounded-2xl border border-primary-200 bg-primary-50/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-text">New lesson</h4>
        <button onClick={onClose} disabled={videoBusy} className="text-muted hover:text-text transition disabled:opacity-40" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <label className={labelClass}>Lesson title</label>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Setting up your project"
        className={`${inputClass} mb-4`}
      />

      <label className={labelClass}>Lesson type</label>
      <div className="flex gap-1 bg-surface-strong rounded-xl p-1 mb-4">
        {typeButton('video', 'Video', <Video className="w-4 h-4" />)}
        {typeButton('text', 'Text', <FileText className="w-4 h-4" />)}
      </div>

      {contentType === 'video' ? (
        <VideoUploader value={content} onChange={setContent} onBusyChange={setVideoBusy} />
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          placeholder="Write your lesson here…"
          className={inputClass}
        />
      )}

      {addLessonMutation.isError && <p className="text-danger-600 text-xs mt-3">{errorText(addLessonMutation.error)}</p>}
      {title.length > 0 && title.trim().length < 3 && <p className="text-muted text-xs mt-3">Title needs at least 3 characters.</p>}

      <div className="flex items-center gap-3 mt-5">
        <button onClick={() => addLessonMutation.mutate()} disabled={!canSave} className={primaryButtonClass}>
          {addLessonMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {videoBusy ? 'Uploading video…' : 'Save lesson'}
        </button>
        <button onClick={onClose} disabled={videoBusy} className={secondaryButtonClass}>Cancel</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* One lesson row; click to preview what students will see             */
/* ------------------------------------------------------------------ */
function LessonRow({ lesson, index }: { lesson: Lesson; index: number }) {
  const [open, setOpen] = useState(false);
  const isVideo = lesson.contentType === 'video';
  return (
    <li className="rounded-xl bg-surface-strong/50">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isVideo ? 'bg-primary-100 text-primary-600' : 'bg-secondary-100 text-secondary-600'}`}>
          {isVideo ? <Play className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium text-text truncate">{index + 1}. {lesson.title}</span>
          <span className="block text-[11px] text-muted">{isVideo ? 'Video lesson' : 'Text lesson'}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-3 pb-3">
          {isVideo ? (
            <LessonVideo url={lesson.content} />
          ) : (
            <div className="rounded-xl bg-surface p-4 text-sm text-text whitespace-pre-wrap leading-relaxed">{lesson.content}</div>
          )}
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* The page                                                            */
/* ------------------------------------------------------------------ */
export default function TeacherCourseEditor() {
  const { id: courseId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const overviewQuery = useTeacherOverview();

  const [moduleTitle, setModuleTitle] = useState('');
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null); // which module's "New lesson" panel is open

  const courseQuery = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => (await api.get<Course>(`/courses/${courseId}`)).data,
    enabled: !!courseId,
  });

  const curriculumQuery = useQuery({
    queryKey: ['curriculum', courseId],
    queryFn: async () => (await api.get<CourseModuleWithLessons[]>(`/courses/${courseId}/curriculum`)).data,
    enabled: !!courseId,
  });

  const addModuleMutation = useMutation({
    mutationFn: async () => (await api.post(`/courses/${courseId}/modules`, { title: moduleTitle.trim() })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum', courseId] });
      setModuleTitle('');
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => (await api.patch<Course>(`/courses/${courseId}/publish`)).data,
    onSuccess: (updated) => {
      queryClient.setQueryData(['course', courseId], updated);
      queryClient.invalidateQueries({ queryKey: TEACHER_OVERVIEW_KEY });
    },
  });

  const course = courseQuery.data;
  const modules = curriculumQuery.data ?? [];
  const lessonCount = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const studentCount = overviewQuery.data?.courses.find((c) => c.id === courseId)?.studentCount ?? 0;

  // ----- loading / error / not-yours states -----
  if (courseQuery.isLoading) {
    return (
      <DashboardLayout sidebarSections={teacherSidebarSections}>
        <p className="text-sm text-muted">Loading course…</p>
      </DashboardLayout>
    );
  }
  if (courseQuery.isError || !course) {
    return (
      <DashboardLayout sidebarSections={teacherSidebarSections}>
        <div className={`${cardClass} p-10 text-center max-w-md`}>
          <p className="text-text font-medium mb-3">Course not found.</p>
          <Link to="/teacher/drafts" className={secondaryButtonClass}>Back to your courses</Link>
        </div>
      </DashboardLayout>
    );
  }
  if (user && user.id !== course.teacherId) {
    return (
      <DashboardLayout sidebarSections={teacherSidebarSections}>
        <div className={`${cardClass} p-10 text-center max-w-md`}>
          <p className="text-text font-medium mb-1">This isn't your course</p>
          <p className="text-sm text-muted mb-4">You can only edit courses you created.</p>
          <Link to="/teacher" className={secondaryButtonClass}>Back to overview</Link>
        </div>
      </DashboardLayout>
    );
  }

  const backTo = course.status === 'published' ? '/teacher/published' : '/teacher/drafts';

  return (
    <DashboardLayout sidebarSections={teacherSidebarSections}>
      <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to {course.status === 'published' ? 'published' : 'draft'} courses
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-text truncate">{course.title}</h1>
            <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 shrink-0 ${chipClass[course.status]}`}>
              {course.status === 'published' ? 'Published' : 'Draft'}
            </span>
          </div>
          <p className="text-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />{modules.length} module{modules.length !== 1 ? 's' : ''}</span>
            <span className="inline-flex items-center gap-1.5"><Play className="w-3.5 h-3.5" />{lessonCount} lesson{lessonCount !== 1 ? 's' : ''}</span>
            <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{studentCount} student{studentCount !== 1 ? 's' : ''}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to={`/courses/${course.id}`} className={secondaryButtonClass}>
            <Eye className="w-4 h-4" /> Preview
          </Link>
          {course.status === 'draft' && (
            <button
              onClick={() => publishMutation.mutate()}
              disabled={lessonCount === 0 || publishMutation.isPending}
              title={lessonCount === 0 ? 'Add at least one lesson before publishing' : 'Make this course visible to students'}
              className={primaryButtonClass}
            >
              {publishMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              Publish
            </button>
          )}
        </div>
      </div>
      {publishMutation.isError && <p className="text-danger-600 text-sm -mt-4 mb-6">{errorText(publishMutation.error)}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT: curriculum */}
        <div className="lg:col-span-2 space-y-5">
          <section className={`${cardClass} p-5`}>
            <h2 className="font-semibold text-text mb-3">Add a module</h2>
            <p className="text-xs text-muted mb-3">Modules group related lessons, e.g. "Getting Started" or "Advanced Topics".</p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (moduleTitle.trim().length >= 3) addModuleMutation.mutate();
              }}
            >
              <input
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                placeholder="Module title"
                className={inputClass}
              />
              <button type="submit" disabled={addModuleMutation.isPending || moduleTitle.trim().length < 3} className={`${primaryButtonClass} shrink-0`}>
                {addModuleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </button>
            </form>
            {addModuleMutation.isError && <p className="text-danger-600 text-xs mt-2">{errorText(addModuleMutation.error)}</p>}
          </section>

          {curriculumQuery.isLoading && <p className="text-sm text-muted">Loading curriculum…</p>}

          {modules.map((module, moduleIndex) => (
            <section key={module.id} className={`${cardClass} p-5`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-sm font-bold flex items-center justify-center shrink-0">
                  {moduleIndex + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-text truncate">{module.title}</h3>
                  <p className="text-xs text-muted">{module.lessons.length} lesson{module.lessons.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {module.lessons.length > 0 ? (
                <ul className="space-y-2">
                  {module.lessons.map((lesson, i) => (
                    <LessonRow key={lesson.id} lesson={lesson} index={i} />
                  ))}
                </ul>
              ) : (
                activeModuleId !== module.id && <p className="text-xs text-muted">No lessons yet.</p>
              )}

              {activeModuleId === module.id ? (
                <AddLessonPanel courseId={course.id} moduleId={module.id} onClose={() => setActiveModuleId(null)} />
              ) : (
                <button
                  onClick={() => setActiveModuleId(module.id)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-dashed border-primary-300 px-4 py-2 text-xs font-semibold text-primary-600 hover:bg-primary-50 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add lesson
                </button>
              )}
            </section>
          ))}

          {curriculumQuery.data?.length === 0 && (
            <div className={`${cardClass} p-10 text-center`}>
              <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-3">
                <Layers className="w-6 h-6" />
              </div>
              <p className="text-text font-medium mb-1">No modules yet</p>
              <p className="text-sm text-muted">Add your first module above, then upload lessons into it.</p>
            </div>
          )}
        </div>

        {/* RIGHT: cover, details, checklist */}
        <CourseDetailsPanel course={course} moduleCount={modules.length} lessonCount={lessonCount} />
      </div>
    </DashboardLayout>
  );
}
