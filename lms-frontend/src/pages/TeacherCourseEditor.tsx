import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { api } from '../lib/axios';
import type { Course } from '../types/course';
import type { CourseModuleWithLessons, LessonResource } from '../types/courseContent';
import DashboardLayout from '../components/DashboardLayout';
import LessonAssignments from '../components/LessonAssignments';
import LessonForm, { type LessonFormValues } from '../components/LessonForm';
import { teacherSidebarSections } from '../config/teacherSidebar';

const NOTE_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.txt';

const inputClass =
  'bg-surface-strong border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition';

const iconButtonClass =
  'w-7 h-7 rounded-full flex items-center justify-center text-muted hover:text-primary-700 hover:bg-primary-100 transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message ?? fallback;
}

// returns a copy of the list with the item at `index` swapped with its neighbour
function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const copy = [...items];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

export default function TeacherCourseEditor() {
  const { id: courseId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [actionError, setActionError] = useState<string | null>(null); // banner for failed structural actions

  const [moduleTitle, setModuleTitle] = useState('');
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleTitleDraft, setModuleTitleDraft] = useState('');

  const [activeModuleId, setActiveModuleId] = useState<string | null>(null); // module whose "add lesson" form is open
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null); // lesson whose edit form is open

  // Lecture notes form state — only one lesson's notes form is open at a time
  const [notesLessonId, setNotesLessonId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [noteInputKey, setNoteInputKey] = useState(0);

  // ───────────── queries ─────────────

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

  const resourcesQuery = useQuery({
    queryKey: ['resources', courseId],
    queryFn: async () => (await api.get<LessonResource[]>(`/courses/${courseId}/resources`)).data,
    enabled: !!courseId,
  });

  const modules = curriculumQuery.data ?? [];
  const totalLessons = modules.reduce((sum, module) => sum + module.lessons.length, 0);
  const isDraft = courseQuery.data?.status === 'draft';

  const resourcesByLesson = (resourcesQuery.data ?? []).reduce<Record<string, LessonResource[]>>((groups, resource) => {
    (groups[resource.lessonId] ??= []).push(resource);
    return groups;
  }, {});

  // ───────────── mutations ─────────────

  const refreshContent = () => {
    queryClient.invalidateQueries({ queryKey: ['curriculum', courseId] });
    queryClient.invalidateQueries({ queryKey: ['resources', courseId] });
    queryClient.invalidateQueries({ queryKey: ['assignments', courseId] });
    queryClient.invalidateQueries({ queryKey: ['submission-summary', courseId] });
    queryClient.invalidateQueries({ queryKey: ['teacher-overview'] });
  };

  const handleError = (fallback: string) => (error: unknown) => setActionError(getErrorMessage(error, fallback));

  const addModuleMutation = useMutation({
    mutationFn: async () => (await api.post(`/courses/${courseId}/modules`, { title: moduleTitle.trim() })).data,
    onSuccess: () => {
      setActionError(null);
      refreshContent();
      setModuleTitle('');
    },
    onError: handleError('Could not add the module.'),
  });

  const renameModuleMutation = useMutation({
    mutationFn: async ({ moduleId, title }: { moduleId: string; title: string }) =>
      (await api.patch(`/courses/${courseId}/modules/${moduleId}`, { title })).data,
    onSuccess: () => {
      setActionError(null);
      refreshContent();
      setEditingModuleId(null);
    },
    onError: handleError('Could not rename the module.'),
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (moduleId: string) => (await api.delete(`/courses/${courseId}/modules/${moduleId}`)).data,
    onSuccess: () => {
      setActionError(null);
      refreshContent();
    },
    onError: handleError('Could not delete the module.'),
  });

  const reorderModulesMutation = useMutation({
    mutationFn: async (ids: string[]) => (await api.patch(`/courses/${courseId}/reorder-modules`, { ids })).data,
    onSuccess: () => {
      setActionError(null);
      refreshContent();
    },
    onError: handleError('Could not reorder the modules.'),
  });

  const addLessonMutation = useMutation({
    mutationFn: async ({ moduleId, values }: { moduleId: string; values: LessonFormValues }) =>
      (await api.post(`/courses/${courseId}/modules/${moduleId}/lessons`, values)).data,
    onSuccess: () => {
      setActionError(null);
      refreshContent();
      setActiveModuleId(null);
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: async ({ lessonId, values }: { lessonId: string; values: LessonFormValues }) =>
      (await api.patch(`/courses/${courseId}/lessons/${lessonId}`, values)).data,
    onSuccess: () => {
      setActionError(null);
      refreshContent();
      setEditingLessonId(null);
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => (await api.delete(`/courses/${courseId}/lessons/${lessonId}`)).data,
    onSuccess: () => {
      setActionError(null);
      refreshContent();
    },
    onError: handleError('Could not delete the lesson.'),
  });

  const reorderLessonsMutation = useMutation({
    mutationFn: async ({ moduleId, ids }: { moduleId: string; ids: string[] }) =>
      (await api.patch(`/courses/${courseId}/modules/${moduleId}/reorder-lessons`, { ids })).data,
    onSuccess: () => {
      setActionError(null);
      refreshContent();
    },
    onError: handleError('Could not reorder the lessons.'),
  });

  const publishMutation = useMutation({
    mutationFn: async () => (await api.patch<Course>(`/courses/${courseId}/publish`)).data,
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      queryClient.invalidateQueries({ queryKey: ['my-courses'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-overview'] });
    },
    onError: handleError('Could not publish the course.'),
  });

  const uploadNoteMutation = useMutation({
    mutationFn: async ({ lessonId, file, title }: { lessonId: string; file: File; title: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (title.trim()) formData.append('title', title.trim());
      const response = await api.post<LessonResource>(
        `/courses/${courseId}/lessons/${lessonId}/resources`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources', courseId] });
      setNoteTitle('');
      setNoteFile(null);
      setNoteInputKey((key) => key + 1);
      setNotesLessonId(null);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      await api.delete(`/courses/${courseId}/resources/${resourceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources', courseId] });
    },
  });

  // disables the arrows/delete buttons while a structural change is in flight, so clicks can't race
  const structuralBusy =
    reorderModulesMutation.isPending ||
    reorderLessonsMutation.isPending ||
    deleteModuleMutation.isPending ||
    deleteLessonMutation.isPending;

  // ───────────── handlers ─────────────

  const moveModule = (index: number, direction: -1 | 1) => {
    setActionError(null);
    reorderModulesMutation.mutate(moveItem(modules, index, direction).map((m) => m.id));
  };

  const moveLesson = (module: CourseModuleWithLessons, index: number, direction: -1 | 1) => {
    setActionError(null);
    reorderLessonsMutation.mutate({
      moduleId: module.id,
      ids: moveItem(module.lessons, index, direction).map((l) => l.id),
    });
  };

  const openNotesForm = (lessonId: string) => {
    uploadNoteMutation.reset();
    setNoteTitle('');
    setNoteFile(null);
    setNoteInputKey((key) => key + 1);
    setNotesLessonId(lessonId);
  };

  const closeNotesForm = () => {
    setNotesLessonId(null);
    setNoteTitle('');
    setNoteFile(null);
    setNoteInputKey((key) => key + 1);
  };

  const startRenameModule = (module: CourseModuleWithLessons) => {
    setEditingModuleId(module.id);
    setModuleTitleDraft(module.title);
  };

  return (
    <DashboardLayout sidebarSections={teacherSidebarSections}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-2 max-w-2xl">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-text mb-1">Course Content</h1>
          <p className="text-muted">
            {courseQuery.data?.title ? `${courseQuery.data.title} · ` : ''}
            {totalLessons} lesson{totalLessons === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to={`/teacher/courses/${courseId}/submissions`}
            className="text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            View submissions
          </Link>
          {courseQuery.data &&
            (isDraft ? (
              <button
                onClick={() => {
                  setActionError(null);
                  publishMutation.mutate();
                }}
                disabled={publishMutation.isPending || totalLessons === 0}
                title={totalLessons === 0 ? 'Add at least one lesson first' : 'Publish this course'}
                className="bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-4 py-2 rounded-full text-xs font-semibold disabled:opacity-50"
              >
                {publishMutation.isPending ? 'Publishing...' : 'Publish course'}
              </button>
            ) : (
              <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-secondary-100 text-secondary-700">
                Published
              </span>
            ))}
        </div>
      </div>
      {isDraft && totalLessons === 0 && (
        <p className="text-xs text-tertiary-600 mb-4">Add at least one lesson to be able to publish this course.</p>
      )}
      <p className="text-muted mb-6 mt-2">
        Add, edit, reorder and delete modules and lessons, plus lecture notes and assignments.
      </p>

      {actionError && (
        <div className="max-w-2xl mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">
          {actionError}
        </div>
      )}

      {/* Add module */}
      <div className="bg-surface rounded-2xl p-6 shadow-soft mb-8 max-w-lg">
        <h2 className="font-medium text-text mb-3">Add a module</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Module title, e.g. Getting Started"
            value={moduleTitle}
            onChange={(e) => setModuleTitle(e.target.value)}
            className={`flex-1 ${inputClass}`}
          />
          <button
            onClick={() => addModuleMutation.mutate()}
            disabled={addModuleMutation.isPending || moduleTitle.trim().length < 3}
            className="bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* Modules */}
      <div className="max-w-2xl space-y-4">
        {curriculumQuery.isLoading && <p className="text-sm text-muted">Loading curriculum...</p>}

        {modules.map((module, moduleIndex) => (
          <div key={module.id} className="bg-surface rounded-2xl p-5 shadow-soft">
            {/* Module header */}
            {editingModuleId === module.id ? (
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={moduleTitleDraft}
                  onChange={(e) => setModuleTitleDraft(e.target.value)}
                  className={`flex-1 ${inputClass}`}
                />
                <button
                  onClick={() => renameModuleMutation.mutate({ moduleId: module.id, title: moduleTitleDraft.trim() })}
                  disabled={renameModuleMutation.isPending || moduleTitleDraft.trim().length < 3}
                  className="bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingModuleId(null)}
                  className="text-muted text-xs px-3 py-1.5 hover:text-text transition"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 mb-3">
                <h3 className="font-semibold text-text flex-1 min-w-0 truncate">{module.title}</h3>
                <button
                  onClick={() => moveModule(moduleIndex, -1)}
                  disabled={moduleIndex === 0 || structuralBusy}
                  title="Move module up"
                  className={iconButtonClass}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveModule(moduleIndex, 1)}
                  disabled={moduleIndex === modules.length - 1 || structuralBusy}
                  title="Move module down"
                  className={iconButtonClass}
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => startRenameModule(module)}
                  className="text-xs text-primary-600 hover:text-primary-700 px-2"
                >
                  Rename
                </button>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete module "${module.title}" with all its lessons, notes, assignments and student submissions? This cannot be undone.`,
                      )
                    ) {
                      setActionError(null);
                      deleteModuleMutation.mutate(module.id);
                    }
                  }}
                  disabled={structuralBusy}
                  className="text-xs text-red-500 hover:text-red-600 px-2 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            )}

            {/* Lessons */}
            {module.lessons.length > 0 && (
              <div className="space-y-3 mb-4">
                {module.lessons.map((lesson, lessonIndex) => {
                  const notes = resourcesByLesson[lesson.id] ?? [];
                  const isNotesFormOpen = notesLessonId === lesson.id;

                  // Editing: the edit form replaces the whole lesson card
                  if (editingLessonId === lesson.id) {
                    return (
                      <div key={lesson.id} className="bg-surface rounded-lg border border-border/50 px-3 py-2">
                        <p className="text-xs font-semibold text-text">Edit lesson</p>
                        <LessonForm
                          initial={{ title: lesson.title, contentType: lesson.contentType, content: lesson.content }}
                          submitLabel="Save changes"
                          isSaving={updateLessonMutation.isPending}
                          error={
                            updateLessonMutation.isError
                              ? getErrorMessage(updateLessonMutation.error, 'Could not save the lesson.')
                              : null
                          }
                          onSubmit={(values) => updateLessonMutation.mutate({ lessonId: lesson.id, values })}
                          onCancel={() => {
                            updateLessonMutation.reset();
                            setEditingLessonId(null);
                          }}
                        />
                      </div>
                    );
                  }

                  return (
                    <div key={lesson.id} className="bg-surface rounded-lg border border-border/50 px-3 py-2">
                      <div className="flex items-center gap-1 text-sm text-muted-dark">
                        <span className="text-xs bg-surface-strong text-muted px-2 py-0.5 rounded-full uppercase mr-1">
                          {lesson.contentType}
                        </span>
                        <span className="flex-1 min-w-0 truncate">{lesson.title}</span>
                        <button
                          onClick={() => moveLesson(module, lessonIndex, -1)}
                          disabled={lessonIndex === 0 || structuralBusy}
                          title="Move lesson up"
                          className={iconButtonClass}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveLesson(module, lessonIndex, 1)}
                          disabled={lessonIndex === module.lessons.length - 1 || structuralBusy}
                          title="Move lesson down"
                          className={iconButtonClass}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            updateLessonMutation.reset();
                            setEditingLessonId(lesson.id);
                          }}
                          className="text-xs text-primary-600 hover:text-primary-700 px-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete lesson "${lesson.title}" with its notes, assignments and student submissions? This cannot be undone.`,
                              )
                            ) {
                              setActionError(null);
                              deleteLessonMutation.mutate(lesson.id);
                            }
                          }}
                          disabled={structuralBusy}
                          className="text-xs text-red-500 hover:text-red-600 px-2 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>

                      {/* Lecture notes attached to this lesson */}
                      {notes.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {notes.map((note) => (
                            <li
                              key={note.id}
                              className="flex items-center gap-2 text-xs bg-surface-strong rounded-md px-2 py-1.5"
                            >
                              <span className="text-muted">📄</span>
                              <a
                                href={note.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 text-primary-600 hover:text-primary-700 truncate"
                                title={note.fileName}
                              >
                                {note.title}
                              </a>
                              <span className="text-muted whitespace-nowrap">{formatFileSize(note.sizeBytes)}</span>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Delete "${note.title}"?`)) deleteNoteMutation.mutate(note.id);
                                }}
                                disabled={deleteNoteMutation.isPending}
                                className="text-red-500 hover:text-red-600 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {isNotesFormOpen ? (
                        <div className="mt-3 border-t border-border pt-3">
                          <input
                            type="text"
                            placeholder="Notes title (optional), e.g. Week 1 slides"
                            value={noteTitle}
                            onChange={(e) => setNoteTitle(e.target.value)}
                            className={`w-full ${inputClass} mb-2`}
                          />
                          <input
                            key={noteInputKey}
                            type="file"
                            accept={NOTE_ACCEPT}
                            onChange={(e) => setNoteFile(e.target.files?.[0] ?? null)}
                            className="w-full text-xs text-muted file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface-strong file:text-text hover:file:bg-surface-high"
                          />
                          <p className="text-xs text-muted mt-1">PDF, DOC, DOCX, PPT, PPTX or TXT — max 25 MB.</p>

                          {uploadNoteMutation.isError && (
                            <p className="text-xs text-red-500 mt-2">
                              {getErrorMessage(uploadNoteMutation.error, 'Upload failed. Please try again.')}
                            </p>
                          )}

                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() =>
                                noteFile &&
                                uploadNoteMutation.mutate({ lessonId: lesson.id, file: noteFile, title: noteTitle })
                              }
                              disabled={uploadNoteMutation.isPending || !noteFile}
                              className="bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                            >
                              {uploadNoteMutation.isPending ? 'Uploading...' : 'Upload notes'}
                            </button>
                            <button
                              onClick={closeNotesForm}
                              className="text-muted text-xs px-4 py-1.5 hover:text-text transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => openNotesForm(lesson.id)}
                          className="mt-2 text-xs text-primary-600 font-medium hover:text-primary-700 transition"
                        >
                          + Add lecture notes
                        </button>
                      )}

                      {/* Assignments attached to this lesson */}
                      {courseId && <LessonAssignments courseId={courseId} lessonId={lesson.id} />}
                    </div>
                  );
                })}
              </div>
            )}

            {module.lessons.length === 0 && <p className="text-xs text-muted mb-4">No lessons yet.</p>}

            {/* Add lesson */}
            {activeModuleId === module.id ? (
              <LessonForm
                submitLabel="Save lesson"
                isSaving={addLessonMutation.isPending}
                error={
                  addLessonMutation.isError
                    ? getErrorMessage(addLessonMutation.error, 'Could not save the lesson.')
                    : null
                }
                onSubmit={(values) => addLessonMutation.mutate({ moduleId: module.id, values })}
                onCancel={() => {
                  addLessonMutation.reset();
                  setActiveModuleId(null);
                }}
              />
            ) : (
              <button
                onClick={() => {
                  addLessonMutation.reset();
                  setActiveModuleId(module.id);
                }}
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