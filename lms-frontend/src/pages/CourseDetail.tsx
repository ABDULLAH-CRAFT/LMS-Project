// lms-frontend/src/pages/CourseDetail.tsx
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { Course } from '../types/course';
import type { CourseModuleWithLessons } from '../types/courseContent';
import { usePayCart } from '../hooks/usePayCard';

export default function CourseDetail() {
  const payMutation=usePayCart()
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);

  const courseQuery = useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      const response = await api.get<Course>(`/courses/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const curriculumQuery = useQuery({
    queryKey: ['curriculum', id],
    queryFn: async () => {
      const response = await api.get<CourseModuleWithLessons[]>(`/courses/${id}/curriculum`);
      return response.data;
    },
    enabled: !!id,
  });

  const enrollmentCheckQuery = useQuery({
    queryKey: ['enrollment-check', id],
    queryFn: async () => {
      const response = await api.get<{ enrolled: boolean }>(`/enrollments/check/${id}`);
      return response.data;
    },
    enabled: !!id,
    retry: false,
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/enrollments', { courseId: id });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment-check', id] });
    },
  });

  if (courseQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted">
        Loading course...
      </div>
    );
  }

  if (courseQuery.isError || !courseQuery.data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <p className="text-muted">Course not found.</p>
        <Link to="/student" className="text-sm font-medium text-primary-600 hover:text-primary-700">
          ← Back to catalog
        </Link>
      </div>
    );
  }

  const course = courseQuery.data;
  const isEnrolled = enrollmentCheckQuery.data?.enrolled ?? false;
  const totalLessons = curriculumQuery.data?.reduce((sum, m) => sum + m.lessons.length, 0) ?? 0;

  function renderLessonContent(contentType: string, content: string) {
    if (contentType === 'video') {
      return <a href={content} target="_blank" rel="noopener noreferrer" className="text-sm text-secondary-600 hover:underline break-all">{content}</a>;
    }
    return <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{content}</p>;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">

      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-40 -top-40 h-125 w-125 rounded-full bg-primary-700/10 blur-[140px]" />
        <div className="absolute -right-40 top-1/3 h-125 w-125 rounded-full bg-secondary-600/10 blur-[140px]" />
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 relative z-10">

        <Link to="/student" className="text-sm text-muted hover:text-text transition mb-6 inline-block">
          ← Back to catalog
        </Link>

        <div className="bg-surface rounded-2xl overflow-hidden shadow-soft mb-6">
          <div className="h-48 bg-gradient-to-br from-primary-600 to-secondary-500 flex items-center justify-center">
            <span className="text-6xl font-bold text-white">{course.title.charAt(0).toUpperCase()}</span>
          </div>

          <div className="p-8">
            <h1 className="text-2xl font-bold text-text mb-2">{course.title}</h1>
            <p className="text-muted mb-2 leading-relaxed">{course.description}</p>

            {curriculumQuery.data && (
              <p className="text-xs text-muted mb-6">
                {curriculumQuery.data.length} module{curriculumQuery.data.length !== 1 ? 's' : ''} · {totalLessons} lesson{totalLessons !== 1 ? 's' : ''}
              </p>
            )}

            <div className="flex items-center justify-between border-t border-border pt-6">
              <span className="text-2xl font-bold text-text">₹{course.price}</span>

              {isEnrolled ? (
                <span className="bg-secondary-500/10 border border-secondary-500/30 text-secondary-600 px-6 py-3 rounded-full text-sm font-medium">
                  ✓ Enrolled
                </span>
              ) : (
                <button
                  onClick={() => {
                    const token = localStorage.getItem('accessToken');
                    if (!token) {
                      navigate('/login', { state: { redirectTo: `/courses/${id}` } });
                      return;
                    }
                    payMutation.mutate(
                      { courses: [course] },
                      {
                        onSuccess: () => {
                          queryClient.invalidateQueries({ queryKey: ['enrollment-check', id] });
                        },
                      },
                    );
                  }}
                  disabled={payMutation.isPending}
                  className="bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-6 py-3 rounded-full text-sm font-semibold hover:scale-[1.02] transition disabled:opacity-50"
                >
                  {enrollMutation.isPending ? 'Enrolling...' : 'Enroll now'}
                </button>
              )}
            </div>

            {enrollMutation.isError && (
              <p className="text-danger-600 text-xs mt-3">Something went wrong. Please try again.</p>
            )}
          </div>
        </div>

        {curriculumQuery.data && curriculumQuery.data.length > 0 && (
          <div className="bg-surface rounded-2xl overflow-hidden shadow-soft ">
            <div className="px-6 py-5 border-b border-border">
              <h2 className="font-semibold text-text">Course content</h2>
            </div>

            <div className="divide-y divide-border">
              {curriculumQuery.data.map((module, moduleIndex) => (
                <div key={module.id} className="px-6 py-4">
                  <p className="text-sm font-medium text-text mb-2">
                    {moduleIndex + 1}. {module.title}
                  </p>

                  <div className="space-y-1">
                    {module.lessons.map((lesson) => (
                      <div key={lesson.id}>
                        <button
                          onClick={() => {
                            if (!isEnrolled) return;
                            setExpandedLessonId(expandedLessonId === lesson.id ? null : lesson.id);
                          }}
                          className={
                            isEnrolled
                              ? 'w-full flex items-center gap-2 text-sm px-3 py-2 rounded-lg text-left transition text-muted-dark hover:bg-surface cursor-pointer'
                              : 'w-full flex items-center gap-2 text-sm px-3 py-2 rounded-lg text-left transition text-muted cursor-not-allowed'
                          }
                        >
                          {isEnrolled ? (
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                          <span className="flex-1">{lesson.title}</span>
                          <span className="text-xs uppercase text-muted">{lesson.contentType}</span>
                        </button>

                        {expandedLessonId === lesson.id && isEnrolled && (
                          <div className="px-3 pb-3 pl-9">
                            {renderLessonContent(lesson.contentType, lesson.content)}
                          </div>
                        )}
                      </div>
                    ))}

                    {module.lessons.length === 0 && (
                      <p className="text-xs text-muted px-3 py-1">No lessons in this module yet.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!isEnrolled && (
              <div className="px-6 py-4 bg-surface text-center">
                <p className="text-xs text-muted">Enroll to unlock all lesson content.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}