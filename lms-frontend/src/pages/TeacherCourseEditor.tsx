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

  // NEW — uploads the actual video file, returns the URL to store as the lesson's `content`
  const uploadVideoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('video', file);
      const response = await api.post<{ url: string }>('/uploads/video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.url;
    },
    onSuccess: (url) => {
      setLessonForm((prev) => ({ ...prev, content: url }));
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
      <h1 className="text-3xl font-bold text-text mb-1">Course Content</h1>
      <p className="text-muted mb-8">Add modules and lessons to build out this course.</p>

      <div className="bg-surface rounded-2xl p-6 shadow-soft mb-8 max-w-lg">
        <h2 className="font-medium text-text mb-3">Add a module</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Module title, e.g. Getting Started"
            value={moduleTitle}
            onChange={(e) => setModuleTitle(e.target.value)}
            className="flex-1 bg-surface-strong border border-border rounded-lg px-4 py-2 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition"
          />
          <button
            onClick={() => addModuleMutation.mutate()}
            disabled={addModuleMutation.isPending || !moduleTitle}
            className="bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      <div className="max-w-lg space-y-4">
        {curriculumQuery.isLoading && <p className="text-sm text-muted">Loading curriculum...</p>}

        {curriculumQuery.data?.map((module) => (
          <div key={module.id} className="bg-surface rounded-2xl p-5 shadow-soft ">
            <h3 className="font-semibold text-text mb-3">{module.title}</h3>

            {module.lessons.length > 0 && (
              <div className="space-y-2 mb-4">
                {module.lessons.map((lesson) => (
                  <div key={lesson.id} className="flex items-center gap-2 text-sm text-muted-dark bg-surface rounded-lg px-3 py-2">
                    <span className="text-xs bg-surface-strong text-muted px-2 py-0.5 rounded-full uppercase">
                      {lesson.contentType}
                    </span>
                    {lesson.title}
                  </div>
                ))}
              </div>
            )}

            {module.lessons.length === 0 && (
              <p className="text-xs text-muted mb-4">No lessons yet.</p>
            )}

            {activeModuleId === module.id ? (
              <div className="border-t border-border pt-4">
                <input
                  type="text"
                  placeholder="Lesson title"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  className="w-full bg-surface-strong border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition mb-2"
                />
                <select
                  value={lessonForm.contentType}
                  onChange={(e) => setLessonForm({ ...lessonForm, contentType: e.target.value as 'text' | 'video', content: '' })}
                  className="w-full bg-surface-strong border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary-500/50 transition mb-2"
                >
                  <option value="text" className="bg-[#0a0a12]">Text</option>
                  <option value="video" className="bg-[#0a0a12]">Video</option>
                </select>

                {lessonForm.contentType === 'text' ? (
                  <textarea
                    placeholder="Lesson content"
                    value={lessonForm.content}
                    onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                    rows={3}
                    className="w-full bg-surface-strong border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition mb-2"
                  />
                ) : (
                  <div className="mb-2">
                    {/* NEW — real file upload */}
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadVideoMutation.mutate(file);
                      }}
                      className="w-full text-xs text-muted file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface-strong file:text-text hover:file:bg-surface-high"
                    />
                    {uploadVideoMutation.isPending && <p className="text-xs text-muted mt-1">Uploading...</p>}
                    {lessonForm.content && !uploadVideoMutation.isPending && (
                      <p className="text-xs text-secondary-600 mt-1 break-all">Uploaded: {lessonForm.content}</p>
                    )}
                    <input
                      type="text"
                      placeholder="...or paste a video URL instead"
                      value={lessonForm.content}
                      onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                      className="w-full bg-surface-strong border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition mt-2"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => addLessonMutation.mutate(module.id)}
                    disabled={addLessonMutation.isPending || uploadVideoMutation.isPending || !lessonForm.title || !lessonForm.content}
                    className="bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                  >
                    Save lesson
                  </button>
                  <button
                    onClick={() => setActiveModuleId(null)}
                    className="text-muted text-xs px-4 py-1.5 hover:text-text transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setActiveModuleId(module.id)}
                className="text-xs text-primary-600 font-medium hover:text-primary-700 transition"
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