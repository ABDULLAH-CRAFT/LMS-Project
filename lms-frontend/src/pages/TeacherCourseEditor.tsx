import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { CourseModuleWithLessons } from '../types/courseContent';
import DashboardLayout from '../components/DashboardLayout';
import { teacherSidebarSections } from '../config/teacherSidebar';

export default function TeacherCourseEditor() {
  const { id: courseId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [moduleTitle, setModuleTitle] = useState('');
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({ title: '', contentType: 'text' as 'text' | 'video', content: '' });

  const curriculumQuery = useQuery({
    queryKey: ['curriculum', courseId],
    queryFn: async () => {
      const response = await api.get<CourseModuleWithLessons[]>(`/courses/${courseId}/curriculum`);
      return response.data;
    },
    enabled: !!courseId,
  });

  const addModuleMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/courses/${courseId}/modules`, { title: moduleTitle });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum', courseId] });
      setModuleTitle('');
    },
  });

  const addLessonMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      const response = await api.post(`/courses/${courseId}/modules/${moduleId}/lessons`, lessonForm);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum', courseId] });
      setLessonForm({ title: '', contentType: 'text', content: '' });
      setActiveModuleId(null);
    },
  });

  return (
    <DashboardLayout sidebarSections={teacherSidebarSections}>
      <h1 className="text-3xl font-bold text-text mb-1">Course Content</h1> {/* CHANGED — white heading */}
      <p className="text-muted mb-8">Add modules and lessons to build out this course.</p>

      <div className="bg-surface rounded-2xl p-6 shadow-soft mb-8 max-w-lg"> {/* CHANGED — glass card */}
        <h2 className="font-medium text-text mb-3">Add a module</h2> {/* CHANGED — white */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Module title, e.g. Getting Started"
            value={moduleTitle}
            onChange={(e) => setModuleTitle(e.target.value)}
            className="flex-1 bg-surface-strong border border-border rounded-lg px-4 py-2 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition" // CHANGED — glass input
          />
          <button
            onClick={() => addModuleMutation.mutate()}
            disabled={addModuleMutation.isPending || !moduleTitle}
            className="bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50" // CHANGED — gradient button
          >
            Add
          </button>
        </div>
      </div>

      <div className="max-w-lg space-y-4">
        {curriculumQuery.isLoading && <p className="text-sm text-muted">Loading curriculum...</p>}

        {curriculumQuery.data?.map((module) => (
          <div key={module.id} className="bg-surface rounded-2xl p-5 shadow-soft "> {/* CHANGED — glass card */}
            <h3 className="font-semibold text-text mb-3">{module.title}</h3> {/* CHANGED — white title */}

            {module.lessons.length > 0 && (
              <div className="space-y-2 mb-4">
                {module.lessons.map((lesson) => (
                  <div key={lesson.id} className="flex items-center gap-2 text-sm text-muted-dark bg-surface rounded-lg px-3 py-2"> {/* CHANGED — light-on-dark row */}
                    <span className="text-xs bg-surface-strong text-muted px-2 py-0.5 rounded-full uppercase"> {/* CHANGED — glass badge */}
                      {lesson.contentType}
                    </span>
                    {lesson.title}
                  </div>
                ))}
              </div>
            )}

            {module.lessons.length === 0 && (
              <p className="text-xs text-muted mb-4">No lessons yet.</p> // CHANGED — muted
            )}

            {activeModuleId === module.id ? (
              <div className="border-t border-border pt-4"> {/* CHANGED — dark divider */}
                <input
                  type="text"
                  placeholder="Lesson title"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  className="w-full bg-surface-strong border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition mb-2" // CHANGED — glass input
                />
                <select
                  value={lessonForm.contentType}
                  onChange={(e) => setLessonForm({ ...lessonForm, contentType: e.target.value as 'text' | 'video' })}
                  className="w-full bg-surface-strong border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary-500/50 transition mb-2" // CHANGED — glass select
                >
                  <option value="text" className="bg-[#0a0a12]">Text</option> {/* CHANGED — dark dropdown background so options are readable */}
                  <option value="video" className="bg-[#0a0a12]">Video</option>
                </select>
                <textarea
                  placeholder={lessonForm.contentType === 'video' ? 'Video URL' : 'Lesson content'}
                  value={lessonForm.content}
                  onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                  rows={3}
                  className="w-full bg-surface-strong border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition mb-2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => addLessonMutation.mutate(module.id)}
                    disabled={addLessonMutation.isPending || !lessonForm.title || !lessonForm.content}
                    className="bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50" // CHANGED — gradient button
                  >
                    Save lesson
                  </button>
                  <button
                    onClick={() => setActiveModuleId(null)}
                    className="text-muted text-xs px-4 py-1.5 hover:text-text transition" // CHANGED — dark-theme hover
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setActiveModuleId(module.id)}
                className="text-xs text-primary-600 font-medium hover:text-primary-700 transition" // CHANGED — purple accent link
              >
                + Add lesson
              </button>
            )}
          </div>
        ))}

        {curriculumQuery.data?.length === 0 && (
          <p className="text-sm text-muted">No modules yet — add one above to get started.</p>
        )}
      </div>
    </DashboardLayout>
  );
}