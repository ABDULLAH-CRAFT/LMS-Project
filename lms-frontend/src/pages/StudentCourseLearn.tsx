import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { Course } from '../types/course';
import type { CourseModuleWithLessons } from '../types/courseContent';
import type { CourseProgress } from '../types/progress';

export default function StudentCourseLearn() {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const enrollmentCheckQuery = useQuery({
    queryKey: ['enrollment-check', courseId],
    queryFn: async () => {
      const response = await api.get<{ enrolled: boolean }>(`/enrollments/check/${courseId}`);
      return response.data;
    },
    enabled: !!courseId,
  });

  const isEnrolled = enrollmentCheckQuery.data?.enrolled ?? false;

  useEffect(() => {
    if (enrollmentCheckQuery.data && !isEnrolled) {
      navigate('/student/my-courses'); // guards against opening this page for a course you haven't bought
    }
  }, [enrollmentCheckQuery.data, isEnrolled, navigate]);

  const courseQuery = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const response = await api.get<Course>(`/courses/${courseId}`);
      return response.data;
    },
    enabled: !!courseId,
  });

  const curriculumQuery = useQuery({
    queryKey: ['curriculum', courseId],
    queryFn: async () => {
      const response = await api.get<CourseModuleWithLessons[]>(`/courses/${courseId}/curriculum`);
      return response.data;
    },
    enabled: !!courseId,
  });

  const progressQuery = useQuery({
    queryKey: ['progress', courseId],
    queryFn: async () => {
      const response = await api.get<CourseProgress>(`/progress/courses/${courseId}`);
      return response.data;
    },
    enabled: !!courseId && isEnrolled,
  });

  const completeMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const response = await api.post(`/progress/lessons/${lessonId}/complete`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress', courseId] });
    },
  });

  const flatLessons = useMemo(() => {
    if (!curriculumQuery.data) return [];
    return curriculumQuery.data.flatMap((module) =>
      module.lessons.map((lesson) => ({ ...lesson, moduleTitle: module.title })),
    );
  }, [curriculumQuery.data]);

  useEffect(() => {
    if (!selectedLessonId && flatLessons.length > 0) {
      setSelectedLessonId(flatLessons[0].id); // default to the first lesson
    }
  }, [flatLessons, selectedLessonId]);

  const currentIndex = flatLessons.findIndex((l) => l.id === selectedLessonId);
  const currentLesson = currentIndex >= 0 ? flatLessons[currentIndex] : null;
  const nextLesson = currentIndex >= 0 ? flatLessons[currentIndex + 1] : null;
  const completedSet = new Set(progressQuery.data?.completedLessonIds ?? []);
  const isCurrentComplete = currentLesson ? completedSet.has(currentLesson.id) : false;

  if (courseQuery.isLoading || curriculumQuery.isLoading || !isEnrolled) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/student/my-courses" className="text-muted hover:text-text transition" aria-label="Back to My Courses">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
          <span className="text-sm font-semibold text-text">{courseQuery.data?.title}</span>
        </div>
        {progressQuery.data && (
          <span className="text-xs bg-surface-strong text-muted px-3 py-1 rounded-full font-medium">
            {progressQuery.data.percent}% complete
          </span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Lesson sidebar */}
        <div className="w-80 border-r border-border bg-surface overflow-y-auto shrink-0">
          {curriculumQuery.data?.map((module) => (
            <div key={module.id} className="border-b border-border">
              <p className="text-xs font-semibold text-muted uppercase px-4 py-3">{module.title}</p>
              {module.lessons.map((lesson) => {
                const isActive = lesson.id === selectedLessonId;
                const isDone = completedSet.has(lesson.id);
                return (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-2.5 text-sm transition ${
                      isActive ? 'bg-primary-500/10 text-text' : 'text-muted-dark hover:bg-surface-strong'
                    }`}
                  >
                    {isDone ? (
                      <span className="w-4 h-4 rounded-full bg-secondary-600 flex items-center justify-center shrink-0">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-border shrink-0" />
                    )}
                    <span className="flex-1">{lesson.title}</span>
                    <span className="text-[10px] uppercase text-muted">{lesson.contentType}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!currentLesson && <p className="text-muted">This course has no lessons yet.</p>}

          {currentLesson && (
            <div className="max-w-3xl">
              {currentLesson.contentType === 'video' ? (
                <video
                  key={currentLesson.id}
                  controls
                  className="w-full rounded-2xl bg-black shadow-soft"
                  src={currentLesson.content}
                  onEnded={() => completeMutation.mutate(currentLesson.id)}
                />
              ) : (
                <div className="bg-surface rounded-2xl p-6 shadow-soft whitespace-pre-wrap text-sm text-text leading-relaxed">
                  {currentLesson.content}
                </div>
              )}

              <div className="flex items-center justify-between mt-5">
                <div>
                  <p className="text-xs text-muted mb-1">{currentLesson.moduleTitle}</p>
                  <h2 className="text-lg font-bold text-text">{currentLesson.title}</h2>
                </div>

                {isCurrentComplete ? (
                  <span className="text-xs font-semibold text-secondary-600 bg-secondary-100 px-3 py-1.5 rounded-full">
                    ✓ Completed
                  </span>
                ) : (
                  <button
                    onClick={() => completeMutation.mutate(currentLesson.id)}
                    disabled={completeMutation.isPending}
                    className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition disabled:opacity-50"
                  >
                    Mark as complete
                  </button>
                )}
              </div>

              <div className="mt-8 flex justify-end">
                {nextLesson ? (
                  <button
                    onClick={() => setSelectedLessonId(nextLesson.id)}
                    className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:scale-[1.02] transition"
                  >
                    Go to next lesson
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                ) : (
                  <Link
                    to="/student/my-courses"
                    className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition"
                  >
                    🎉 You've reached the end of the course — back to My Courses
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}