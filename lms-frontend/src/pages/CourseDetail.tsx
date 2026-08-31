import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { Course } from '../types/course';
import type { CourseModuleWithLessons } from '../types/courseContent';

export default function CourseDetail() {
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
      <div className="min-h-screen bg-[#030308] flex items-center justify-center text-gray-500"> {/* CHANGED — dark bg */}
        Loading course...
      </div>
    );
  }

  if (courseQuery.isError || !courseQuery.data) {
    return (
      <div className="min-h-screen bg-[#030308] flex flex-col items-center justify-center gap-3"> {/* CHANGED — dark bg */}
        <p className="text-gray-500">Course not found.</p>
        <Link to="/student" className="text-sm font-medium text-purple-400 hover:text-purple-300"> {/* CHANGED — purple link */}
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
      return <a href={content} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:underline break-all">{content}</a>; // CHANGED — cyan link fits the dark palette better than indigo
    }
    return <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">{content}</p>; // CHANGED — lighter gray for readability on dark bg
  }

  return (
    <div className="min-h-screen bg-[#030308] relative overflow-hidden"> {/* CHANGED — dark base */}

      <div className="pointer-events-none fixed inset-0 z-0"> {/* ambient glow, same device as dashboards */}
        <div className="absolute -left-40 -top-40 h-125 w-125 rounded-full bg-purple-700/10 blur-[140px]" />
        <div className="absolute -right-40 top-1/3 h-125 w-125 rounded-full bg-cyan-600/10 blur-[140px]" />
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 relative z-10"> {/* z-10 above the glow */}

        <Link to="/student" className="text-sm text-gray-500 hover:text-white transition mb-6 inline-block"> {/* CHANGED — dark-theme hover */}
          ← Back to catalog
        </Link>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl mb-6"> {/* CHANGED — glass card */}
          <div className="h-48 bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center"> {/* CHANGED — theme gradient instead of indigo/blue */}
            <span className="text-6xl font-bold text-white/90">{course.title.charAt(0).toUpperCase()}</span>
          </div>

          <div className="p-8">
            <h1 className="text-2xl font-bold text-white mb-2">{course.title}</h1> {/* CHANGED — white heading */}
            <p className="text-gray-400 mb-2 leading-relaxed">{course.description}</p> {/* CHANGED — lighter gray */}

            {curriculumQuery.data && (
              <p className="text-xs text-gray-600 mb-6"> {/* CHANGED — muted */}
                {curriculumQuery.data.length} module{curriculumQuery.data.length !== 1 ? 's' : ''} · {totalLessons} lesson{totalLessons !== 1 ? 's' : ''}
              </p>
            )}

            <div className="flex items-center justify-between border-t border-white/10 pt-6"> {/* CHANGED — dark divider */}
              <span className="text-2xl font-bold text-white">${course.price}</span> {/* CHANGED — white price */}

              {isEnrolled ? (
                <span className="bg-green-500/10 border border-green-500/30 text-green-400 px-6 py-3 rounded-full text-sm font-medium"> {/* CHANGED — glass green badge */}
                  ✓ Enrolled
                </span>
              ) : (
                <button
                  onClick={() => {
                    const token = localStorage.getItem('accessToken'); // check login status before attempting enroll
                    if (!token) {
                      navigate('/login', { state: { redirectTo: `/courses/${id}` } }); // redirect logged-out users to login, remembering this page
                      return;
                    }
                    enrollMutation.mutate();
                  }}
                  disabled={enrollMutation.isPending}
                  className="bg-gradient-to-r from-purple-600 to-cyan-400 text-white px-6 py-3 rounded-full text-sm font-semibold hover:scale-[1.02] transition disabled:opacity-50" // CHANGED — theme gradient button
                >
                  {enrollMutation.isPending ? 'Enrolling...' : 'Enroll now'}
                </button>
              )}
            </div>

            {enrollMutation.isError && (
              <p className="text-red-400 text-xs mt-3">Something went wrong. Please try again.</p> // CHANGED — lighter red for dark bg
            )}
          </div>
        </div>

        {curriculumQuery.data && curriculumQuery.data.length > 0 && (
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl"> {/* CHANGED — glass card */}
            <div className="px-6 py-5 border-b border-white/10"> {/* CHANGED — dark divider */}
              <h2 className="font-semibold text-white">Course content</h2> {/* CHANGED — white heading */}
            </div>

            <div className="divide-y divide-white/5"> {/* CHANGED — subtle dark dividers */}
              {curriculumQuery.data.map((module, moduleIndex) => (
                <div key={module.id} className="px-6 py-4">
                  <p className="text-sm font-medium text-white mb-2"> {/* CHANGED — white module title */}
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
                              ? 'w-full flex items-center gap-2 text-sm px-3 py-2 rounded-lg text-left transition text-gray-300 hover:bg-white/5 cursor-pointer' // CHANGED — light-on-dark, subtle hover
                              : 'w-full flex items-center gap-2 text-sm px-3 py-2 rounded-lg text-left transition text-gray-600 cursor-not-allowed' // CHANGED — dimmer for locked state
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
                          <span className="text-xs uppercase text-gray-600">{lesson.contentType}</span> {/* CHANGED — muted badge */}
                        </button>

                        {expandedLessonId === lesson.id && isEnrolled && (
                          <div className="px-3 pb-3 pl-9">
                            {renderLessonContent(lesson.contentType, lesson.content)}
                          </div>
                        )}
                      </div>
                    ))}

                    {module.lessons.length === 0 && (
                      <p className="text-xs text-gray-600 px-3 py-1">No lessons in this module yet.</p> // CHANGED — muted
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!isEnrolled && (
              <div className="px-6 py-4 bg-white/[0.02] text-center"> {/* CHANGED — subtle glass footer strip */}
                <p className="text-xs text-gray-500">Enroll to unlock all lesson content.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}