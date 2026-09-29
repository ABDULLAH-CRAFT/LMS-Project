import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { Assignment } from '../types/courseContent';
import { Link } from 'react-router-dom';

interface LessonAssignmentsProps {
  courseId: string;
  lessonId: string;
}

interface AssignmentFormState {
  title: string;
  description: string;
  dueDate: string; // value of a <input type="datetime-local">, e.g. "2026-10-15T18:30"
  maxMarks: string;
  file: File | null;
  removeAttachment: boolean;
}

const ATTACHMENT_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.txt,.zip';

const EMPTY_FORM: AssignmentFormState = {
  title: '',
  description: '',
  dueDate: '',
  maxMarks: '100',
  file: null,
  removeAttachment: false,
};

const inputClass =
  'w-full bg-surface-strong border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition';

function getErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message ?? fallback;
}

// ISO string from the backend -> value a datetime-local input understands (in the teacher's local time)
function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function LessonAssignments({ courseId, lessonId }: LessonAssignmentsProps) {
  const queryClient = useQueryClient();

  // 'new' = creating, an assignment id = editing that one, null = form closed
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<AssignmentFormState>(EMPTY_FORM);
  const [fileInputKey, setFileInputKey] = useState(0); // changing this key clears the file input

  // Every lesson on the page uses this same query key, so React Query sends ONE request for the whole course
  const assignmentsQuery = useQuery({
    queryKey: ['assignments', courseId],
    queryFn: async () => {
      const response = await api.get<Assignment[]>(`/courses/${courseId}/assignments`);
      return response.data;
    },
  });

  const assignments = (assignmentsQuery.data ?? []).filter((assignment) => assignment.lessonId === lessonId);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const isNew = editingId === 'new';
      const formData = new FormData();
      formData.append('title', form.title.trim());
      formData.append('description', form.description.trim());
      formData.append('maxMarks', form.maxMarks || '100');

      if (form.dueDate) {
        formData.append('dueDate', new Date(form.dueDate).toISOString());
      } else if (!isNew) {
        formData.append('dueDate', ''); // empty string tells the backend to clear the deadline
      }

      if (form.file) formData.append('file', form.file);
      if (!isNew && form.removeAttachment) formData.append('removeAttachment', 'true');

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      const response = isNew
        ? await api.post<Assignment>(`/courses/${courseId}/lessons/${lessonId}/assignments`, formData, config)
        : await api.patch<Assignment>(`/courses/${courseId}/assignments/${editingId}`, formData, config);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', courseId] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      await api.delete(`/courses/${courseId}/assignments/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', courseId] });
    },
  });

  const openCreateForm = () => {
    saveMutation.reset();
    setForm(EMPTY_FORM);
    setFileInputKey((key) => key + 1);
    setEditingId('new');
  };

  const openEditForm = (assignment: Assignment) => {
    saveMutation.reset();
    setForm({
      title: assignment.title,
      description: assignment.description,
      dueDate: assignment.dueDate ? toLocalInputValue(assignment.dueDate) : '',
      maxMarks: String(assignment.maxMarks),
      file: null,
      removeAttachment: false,
    });
    setFileInputKey((key) => key + 1);
    setEditingId(assignment.id);
  };

  function closeForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFileInputKey((key) => key + 1);
  }

  const editingAssignment = assignments.find((assignment) => assignment.id === editingId);
  const marks = Number(form.maxMarks);
  const isFormValid =
    form.title.trim().length >= 3 &&
    form.description.trim().length > 0 &&
    Number.isInteger(marks) &&
    marks >= 1 &&
    marks <= 1000;

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      <p className="text-xs font-semibold text-text mb-2">Assignments</p>

      {assignmentsQuery.isError && (
        <p className="text-xs text-red-500 mb-2">Couldn't load assignments.</p>
      )}

      {assignments.length > 0 && (
        <ul className="space-y-2 mb-2">
          {assignments.map((assignment) => {
            const isPastDue = assignment.dueDate ? new Date(assignment.dueDate) < new Date() : false;

            // While an assignment is being edited, the form below replaces its row
            if (editingId === assignment.id) return null;

            return (
              <li key={assignment.id} className="bg-surface-strong rounded-md px-3 py-2 text-xs">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text">{assignment.title}</p>
                    <p className="text-muted mt-0.5">
                      {assignment.maxMarks} marks ·{' '}
                      {assignment.dueDate ? (
                        <>
                          Due {formatDueDate(assignment.dueDate)}
                          {isPastDue && <span className="ml-1 text-red-500 font-medium">(past due)</span>}
                        </>
                      ) : (
                        'No deadline'
                      )}
                    </p>
                    <p className="text-muted-dark mt-1 whitespace-pre-line line-clamp-3">{assignment.description}</p>
                    {assignment.attachmentUrl && (
                      <a
                        href={assignment.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block mt-1 text-primary-600 hover:text-primary-700"
                      >
                        📎 {assignment.attachmentName ?? 'Attachment'}
                      </a>
                    )}
                  </div>
                  <div className="flex gap-3 whitespace-nowrap">
                  <Link
                      to={`/teacher/courses/${courseId}/submissions?assignment=${assignment.id}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      Submissions
                    </Link>
                    <button
                      onClick={() => openEditForm(assignment)}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${assignment.title}"?`)) deleteMutation.mutate(assignment.id);
                      }}
                      disabled={deleteMutation.isPending}
                      className="text-red-500 hover:text-red-600 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editingId !== null ? (
        <div className="bg-surface-strong/50 border border-border rounded-lg p-3">
          <p className="text-xs font-semibold text-text mb-2">
            {editingId === 'new' ? 'New assignment' : 'Edit assignment'}
          </p>

          <input
            type="text"
            placeholder="Title, e.g. Week 1 problem set"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={`${inputClass} mb-2`}
          />
          <textarea
            placeholder="Instructions for students"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            className={`${inputClass} mb-2`}
          />

          <div className="grid grid-cols-2 gap-2 mb-2">
            <label className="text-xs text-muted">
              Due date (optional)
              <input
                type="datetime-local"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="text-xs text-muted">
              Max marks
              <input
                type="number"
                min={1}
                max={1000}
                value={form.maxMarks}
                onChange={(e) => setForm({ ...form, maxMarks: e.target.value })}
                className={`${inputClass} mt-1`}
              />
            </label>
          </div>

          {editingAssignment?.attachmentUrl && !form.file && (
            <div className="text-xs text-muted mb-2">
              <p>
                Current attachment:{' '}
                <a
                  href={editingAssignment.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-600 hover:text-primary-700"
                >
                  {editingAssignment.attachmentName ?? 'file'}
                </a>
              </p>
              <label className="flex items-center gap-2 mt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.removeAttachment}
                  onChange={(e) => setForm({ ...form, removeAttachment: e.target.checked })}
                />
                Remove this attachment
              </label>
            </div>
          )}

          <label className="text-xs text-muted block">
            {editingAssignment?.attachmentUrl ? 'Replace attachment (optional)' : 'Attachment (optional)'}
            <input
              key={fileInputKey}
              type="file"
              accept={ATTACHMENT_ACCEPT}
              onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })}
              className="mt-1 w-full text-xs text-muted file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface-strong file:text-text hover:file:bg-surface-high"
            />
          </label>
          <p className="text-xs text-muted mt-1">PDF, DOC, DOCX, PPT, PPTX, TXT or ZIP — max 25 MB.</p>

          {saveMutation.isError && (
            <p className="text-xs text-red-500 mt-2">
              {getErrorMessage(saveMutation.error, 'Could not save the assignment. Please try again.')}
            </p>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !isFormValid}
              className="bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving...' : editingId === 'new' ? 'Create assignment' : 'Save changes'}
            </button>
            <button onClick={closeForm} className="text-muted text-xs px-4 py-1.5 hover:text-text transition">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={openCreateForm}
          className="text-xs text-primary-600 font-medium hover:text-primary-700 transition"
        >
          + Add assignment
        </button>
      )}
    </div>
  );
}