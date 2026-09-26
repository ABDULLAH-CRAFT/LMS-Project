import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CircleCheck, GraduationCap, PlayCircle, Pencil, Plus, Users } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { teacherSidebarSections } from '../config/teacherSidebar';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useTeacherOverview } from '../hooks/useTeacherOverview';
import { GRADIENTS } from '../config/gradients';
import { cardClass, chipClass, primaryButtonClass } from '../config/ui';
import { formatPrice } from '../lib/format';

interface StatCardProps {
  icon: ReactNode;
  tint: string; // tailwind classes for the icon circle
  value: number | string;
  label: string;
}

function StatCard({ icon, tint, value, label }: StatCardProps) {
  return (
    <div className={`${cardClass} p-5 flex flex-col items-start gap-2`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tint}`}>{icon}</div>
      <span className="text-2xl font-extrabold text-text">{value}</span>
      <span className="text-xs text-muted-dark">{label}</span>
    </div>
  );
}

// The teacher's home page. Deliberately NOT the student dashboard: no catalog, no cart, no XP/streaks —
// just the teacher's own courses, their status, and how many students have enrolled.
export default function TeacherDashboard() {
  const { data: user } = useCurrentUser();
  const overviewQuery = useTeacherOverview();
  const overview = overviewQuery.data;

  const firstName = user?.name?.split(' ')[0];
  const drafts = overview?.courses.filter((c) => c.status === 'draft') ?? [];
  const recent = overview?.courses.slice(0, 5) ?? []; // backend returns newest first

  return (
    <DashboardLayout sidebarSections={teacherSidebarSections}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text mb-1">Welcome back{firstName ? `, ${firstName}` : ''}</h1>
          <p className="text-muted">Here's a snapshot of your courses and students.</p>
        </div>
        <Link to="/teacher/drafts?new=1" className={primaryButtonClass}>
          <Plus className="w-4 h-4" /> New course
        </Link>
      </div>

      {overviewQuery.isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-surface shadow-soft" />
          ))}
        </div>
      )}

      {overviewQuery.isError && (
        <div className={`${cardClass} p-6 text-sm text-danger-600`}>
          Couldn't load your dashboard.{' '}
          <button onClick={() => overviewQuery.refetch()} className="font-semibold underline">
            Try again
          </button>
        </div>
      )}

      {overview && overview.totals.courses === 0 && (
        <div className={`${cardClass} p-12 text-center max-w-xl mx-auto`}>
          <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-text mb-1">Create your first course</h2>
          <p className="text-sm text-muted mb-6">
            Add a title and a cover image, then upload your lessons as videos or text. It stays hidden from students until you publish.
          </p>
          <Link to="/teacher/drafts?new=1" className={primaryButtonClass}>
            <Plus className="w-4 h-4" /> Start a course
          </Link>
        </div>
      )}

      {overview && overview.totals.courses > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={<BookOpen className="w-4 h-4" />} tint="bg-primary-100 text-primary-600" value={overview.totals.courses} label="Total courses" />
            <StatCard icon={<CircleCheck className="w-4 h-4" />} tint="bg-secondary-100 text-secondary-600" value={overview.totals.published} label="Published" />
            <StatCard icon={<Pencil className="w-4 h-4" />} tint="bg-tertiary-100 text-tertiary-600" value={overview.totals.drafts} label="Drafts" />
            <StatCard icon={<Users className="w-4 h-4" />} tint="bg-surface-strong text-muted-dark" value={overview.totals.students} label="Student enrollments" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            <section className={`${cardClass} xl:col-span-2 p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-text">Your courses</h2>
                <Link to="/teacher/published" className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition">
                  View published →
                </Link>
              </div>

              <ul className="divide-y divide-border">
                {recent.map((course, index) => (
                  <li key={course.id}>
                    <Link
                      to={`/teacher/courses/${course.id}/edit`}
                      className="flex items-center gap-4 py-3 group rounded-xl hover:bg-surface-strong/50 -mx-2 px-2 transition"
                    >
                      <div className={`relative w-16 h-11 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]}`}>
                        {course.coverImageUrl ? (
                          <img src={course.coverImageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                            {course.title.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text truncate group-hover:text-primary-600 transition-colors">{course.title}</p>
                        <p className="text-xs text-muted">
                          {course.lessonCount} lesson{course.lessonCount !== 1 ? 's' : ''} · {course.studentCount} student
                          {course.studentCount !== 1 ? 's' : ''} · {formatPrice(course.price)}
                        </p>
                      </div>
                      <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 ${chipClass[course.status]}`}>
                        {course.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary-600 transition" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className={`${cardClass} p-6`}>
              <h2 className="font-semibold text-text mb-1">Continue where you left off</h2>
              <p className="text-xs text-muted mb-4">Drafts only you can see.</p>

              {drafts.length === 0 ? (
                <p className="text-sm text-muted">No drafts — everything you've created is live.</p>
              ) : (
                <ul className="space-y-3">
                  {drafts.slice(0, 4).map((course) => (
                    <li key={course.id} className="rounded-xl bg-surface-strong/60 p-3">
                      <p className="text-sm font-semibold text-text truncate">{course.title}</p>
                      <p className="text-xs text-muted mt-0.5 mb-2 flex items-center gap-1">
                        <PlayCircle className="w-3 h-3" />
                        {course.lessonCount === 0
                          ? 'No lessons yet — add your first one'
                          : `${course.lessonCount} lesson${course.lessonCount !== 1 ? 's' : ''} · ready to publish`}
                      </p>
                      <Link to={`/teacher/courses/${course.id}/edit`} className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition">
                        {course.lessonCount === 0 ? 'Add content →' : 'Review & publish →'}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
