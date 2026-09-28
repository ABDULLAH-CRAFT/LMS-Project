import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Users, PlayCircle, Trophy, Plus, Pencil, Layers, Lightbulb } from 'lucide-react';
import { api } from '../lib/axios';
import DashboardLayout from '../components/DashboardLayout';
import CourseFormModal from '../components/CourseFormModal';
import { teacherSidebarSections } from '../config/teacherSidebar';
import { useCurrentUser } from '../hooks/useCurrentUser';
import type { Course, TeacherOverview, TeacherCourseOverview } from '../types/course';

type StatusFilter = 'all' | 'published' | 'draft';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Published' },
  { key: 'draft', label: 'Drafts' },
];

function priceLabel(price: number) {
  return Number(price) <= 0 ? 'Free' : `₹${price}`;
}

export default function TeacherDashboard() {
  const { data: user } = useCurrentUser();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [modalCourse, setModalCourse] = useState<Course | null>(null); // course being edited
  const [creating, setCreating] = useState(false); // create-course modal open

  const overviewQuery = useQuery({
    queryKey: ['teacher-overview'],
    queryFn: async () => {
      const response = await api.get<TeacherOverview>('/courses/mine/overview');
      return response.data;
    },
  });

  const courses: TeacherCourseOverview[] = overviewQuery.data?.courses ?? [];
  const totals = overviewQuery.data?.totals;

  const { publishedCount, draftCount, topCourse, maxStudents, insights } = useMemo(() => {
    const published = courses.filter((c) => c.status === 'published');
    const drafts = courses.filter((c) => c.status === 'draft');
    const top = [...courses].sort((a, b) => b.studentCount - a.studentCount)[0];

    // Rule-based nudges computed from the data we already have — no extra requests.
    const list: { tone: 'warn' | 'good' | 'info'; text: string }[] = [];
    const emptyDrafts = drafts.filter((c) => c.lessonCount === 0).length;
    const readyDrafts = drafts.filter((c) => c.lessonCount > 0).length;
    const quietPublished = published.filter((c) => c.studentCount === 0).length;
    if (readyDrafts > 0)
      list.push({ tone: 'good', text: `${readyDrafts} draft${readyDrafts > 1 ? 's have' : ' has'} lessons and could be published.` });
    if (emptyDrafts > 0)
      list.push({ tone: 'warn', text: `${emptyDrafts} draft${emptyDrafts > 1 ? 's have' : ' has'} no lessons yet.` });
    if (quietPublished > 0)
      list.push({ tone: 'info', text: `${quietPublished} published course${quietPublished > 1 ? 's have' : ' has'} no students yet.` });

    return {
      publishedCount: published.length,
      draftCount: drafts.length,
      topCourse: top && top.studentCount > 0 ? top : null,
      maxStudents: Math.max(1, ...courses.map((c) => c.studentCount)),
      insights: list,
    };
  }, [courses]);

  const visibleCourses = courses.filter((c) => filter === 'all' || c.status === filter);
  const barCourses = [...courses].sort((a, b) => b.studentCount - a.studentCount).slice(0, 8);

  const firstName = user?.name?.split(' ')[0];

  const dotClass = { warn: 'bg-tertiary-500', good: 'bg-secondary-500', info: 'bg-primary-500' };

  return (
    <DashboardLayout sidebarSections={teacherSidebarSections}>
      {/* Fixed to the viewport height on laptop-and-up screens (100vh minus the
          navbar + main padding = 9rem) so the page itself never scrolls — only
          the course list and the chart scroll internally if they overflow. */}
      <div className="flex flex-col gap-4 lg:h-[calc(100vh-9rem)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-text truncate">
              Welcome back{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="text-sm text-muted">Here's how your courses are doing.</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-4 py-2.5 rounded-full text-sm font-semibold hover:scale-[1.02] transition shadow-primary-glow shrink-0"
          >
            <Plus className="w-4 h-4" />
            New course
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          <div className="bg-surface rounded-2xl shadow-soft p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-primary-700" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold text-text leading-none">{totals?.totalCourses ?? '—'}</p>
              <p className="text-xs text-muted-dark mt-1 truncate">
                Courses · {publishedCount} live, {draftCount} draft
              </p>
            </div>
          </div>

          <div className="bg-surface rounded-2xl shadow-soft p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary-100 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-secondary-600" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold text-text leading-none">{totals?.totalStudents ?? '—'}</p>
              <p className="text-xs text-muted-dark mt-1">Students</p>
            </div>
          </div>

          <div className="bg-surface rounded-2xl shadow-soft p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-tertiary-100 flex items-center justify-center shrink-0">
              <PlayCircle className="w-5 h-5 text-tertiary-600" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold text-text leading-none">{totals?.totalLessons ?? '—'}</p>
              <p className="text-xs text-muted-dark mt-1">Lessons</p>
            </div>
          </div>

          <div className="bg-surface rounded-2xl shadow-soft p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-primary-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-text leading-tight truncate">
                {topCourse ? topCourse.title : '—'}
              </p>
              <p className="text-xs text-muted-dark mt-1">
                {topCourse ? `Most popular · ${topCourse.studentCount} student${topCourse.studentCount === 1 ? '' : 's'}` : 'Most popular'}
              </p>
            </div>
          </div>
        </div>

        {/* Main area — fills whatever height is left */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:flex-1 lg:min-h-0">
          {/* Course list */}
          <div className="lg:col-span-2 bg-surface rounded-2xl shadow-soft flex flex-col lg:min-h-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
              <h2 className="font-semibold text-text">Your courses</h2>
              <div className="flex items-center gap-1 bg-surface-strong rounded-full p-0.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={[
                      'text-xs font-medium px-3 py-1 rounded-full transition',
                      filter === f.key ? 'bg-surface text-text shadow-soft' : 'text-muted hover:text-text',
                    ].join(' ')}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto divide-y divide-border">
              {overviewQuery.isLoading &&
                [0, 1, 2].map((i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3 animate-pulse">
                    <div className="w-9 h-9 rounded-xl bg-surface-strong shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/3 rounded bg-surface-strong" />
                      <div className="h-2.5 w-1/4 rounded bg-surface-strong" />
                    </div>
                  </div>
                ))}

              {overviewQuery.isError && (
                <p className="text-sm text-danger-600 p-6 text-center">Couldn't load your courses. Please refresh.</p>
              )}

              {!overviewQuery.isLoading &&
                !overviewQuery.isError &&
                visibleCourses.map((course) => (
                  <div key={course.id} className="px-5 py-3 flex items-center gap-3 hover:bg-surface-strong/40 transition">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-secondary-500 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-white">{course.title.charAt(0).toUpperCase()}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text truncate text-sm">{course.title}</p>
                      <p className="text-xs text-muted">
                        {course.studentCount} student{course.studentCount === 1 ? '' : 's'} · {course.lessonCount} lesson
                        {course.lessonCount === 1 ? '' : 's'}
                      </p>
                    </div>

                    <span
                      className={[
                        'text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0',
                        course.status === 'published'
                          ? 'bg-secondary-100 text-secondary-700'
                          : 'bg-tertiary-100 text-tertiary-700',
                      ].join(' ')}
                    >
                      {course.status === 'published' ? 'Published' : 'Draft'}
                    </span>

                    <span className="text-sm font-semibold text-text shrink-0 w-14 text-right">
                      {priceLabel(course.price)}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setModalCourse(course)}
                        title="Edit details"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-primary-700 hover:bg-primary-100 transition"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <Link
                        to={`/teacher/courses/${course.id}/edit`}
                        title="Manage content"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-primary-700 hover:bg-primary-100 transition"
                      >
                        <Layers className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}

              {!overviewQuery.isLoading && !overviewQuery.isError && courses.length === 0 && (
                <div className="p-8 text-center">
                  <BookOpen className="w-8 h-8 text-muted mx-auto mb-2" />
                  <p className="text-sm font-medium text-text mb-1">No courses yet</p>
                  <p className="text-xs text-muted mb-4">Create your first course and start adding lessons.</p>
                  <button
                    onClick={() => setCreating(true)}
                    className="bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-4 py-2 rounded-full text-xs font-semibold"
                  >
                    Create a course
                  </button>
                </div>
              )}

              {!overviewQuery.isLoading && courses.length > 0 && visibleCourses.length === 0 && (
                <p className="text-sm text-muted p-6 text-center">No {filter === 'draft' ? 'draft' : 'published'} courses.</p>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4 lg:min-h-0">
            <div className="bg-surface rounded-2xl shadow-soft flex flex-col lg:flex-1 lg:min-h-0 overflow-hidden">
              <div className="px-5 py-3 border-b border-border shrink-0">
                <h2 className="font-semibold text-text">Students per course</h2>
              </div>
              <div className="px-5 py-4 space-y-3 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
                {barCourses.length === 0 && !overviewQuery.isLoading && (
                  <p className="text-xs text-muted text-center py-4">Enrollments will show up here.</p>
                )}
                {barCourses.map((course) => (
                  <div key={course.id}>
                    <div className="flex items-center justify-between text-xs mb-1 gap-2">
                      <span className="text-muted-dark truncate">{course.title}</span>
                      <span className="font-semibold text-text shrink-0">{course.studentCount}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-strong overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-secondary-400 transition-all"
                        style={{ width: `${(course.studentCount / maxStudents) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface rounded-2xl shadow-soft px-5 py-4 shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-tertiary-600" />
                <h2 className="font-semibold text-text text-sm">Heads up</h2>
              </div>
              {insights.length === 0 ? (
                <p className="text-xs text-muted">You're all caught up — nothing needs attention.</p>
              ) : (
                <ul className="space-y-1.5">
                  {insights.map((item) => (
                    <li key={item.text} className="flex items-start gap-2 text-xs text-muted-dark">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dotClass[item.tone]}`} />
                      {item.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {creating && <CourseFormModal onClose={() => setCreating(false)} />}
      {modalCourse && <CourseFormModal course={modalCourse} onClose={() => setModalCourse(null)} />}
    </DashboardLayout>
  );
}