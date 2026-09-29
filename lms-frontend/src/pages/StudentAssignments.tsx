import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { StudentAssignment } from '../types/submission';
import DashboardLayout from '../components/DashboardLayout';
import { studentSidebarSections } from '../config/studentSidebar';

const ATTACHMENT_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.txt,.zip,.png,.jpg,.jpeg';

const inputClass =
  'w-full bg-surface-strong border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition';

type Filter = 'all' | 'todo' | 'submitted' | 'graded';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'todo', label: 'To do' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'graded', label: 'Graded' },
];

function getErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message ?? fallback;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function statusOf(assignment: StudentAssignment): Exclude<Filter, 'all'> {
  if (assignment.submission?.gradedAt) return 'graded';
  if (assignment.submission) return 'submitted';
  return 'todo';
}

function AssignmentCard({ assignment }: { assignment: StudentAssignment }) {
  const queryClient = useQueryClient();
  const submission = assignment.submission;
  const status = statusOf(assignment);
  const isPastDue = assignment.dueDate ? new Date(assignment.dueDate) < new Date() : false;

  const [text, setText] = useState(submission?.textAnswer ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('textAnswer', text.trim());
      if (file) formData.append('file', file);
      const response = await api.post(
        `/courses/${assignment.courseId}/assignments/${assignment.id}/submissions`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-assignments'] });
      setFile(null);
      setFileInputKey((key) => key + 1);
    },
  });

  const canSubmit = text.trim().length > 0 || !!file || !!submission?.fileUrl;

  return (
    <div className="bg-surface rounded-2xl shadow-soft p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-text">{assignment.title}</p>
          <p className="text-xs text-muted mt-0.5">
            {assignment.courseTitle}
            {assignment.lessonTitle ? ` · ${assignment.lessonTitle}` : ''}
          </p>
        </div>
        <span
          className={[
            'text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0',
            status === 'graded'
              ? 'bg-secondary-100 text-secondary-700'
              : status === 'submitted'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-tertiary-100 text-tertiary-700',
          ].join(' ')}
        >
          {status === 'graded' ? 'Graded' : status === 'submitted' ? 'Submitted' : 'To do'}
        </span>
      </div>

      <p className="text-xs text-muted mt-2">
        {assignment.maxMarks} marks ·{' '}
        {assignment.dueDate ? (
          <>
            Due {formatDate(assignment.dueDate)}
            {isPastDue && status === 'todo' && (
              <span className="ml-1 text-red-500 font-medium">(past due — late work is flagged)</span>
            )}
          </>
        ) : (
          'No deadline'
        )}
      </p>

      <p className="text-sm text-text mt-3 whitespace-pre-line">{assignment.description}</p>
      {assignment.attachmentUrl && (
        <a
          href={assignment.attachmentUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block mt-2 text-xs text-primary-600 hover:text-primary-700"
        >
          📎 {assignment.attachmentName ?? 'Attachment'}
        </a>
      )}

      {/* Graded: read-only result */}
      {status === 'graded' && submission && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-sm font-semibold text-text">
            Score: {submission.grade} / {assignment.maxMarks}
          </p>
          {submission.feedback && (
            <p className="text-sm text-muted-dark mt-2 whitespace-pre-wrap bg-surface-strong rounded-lg px-3 py-2">
              {submission.feedback}
            </p>
          )}
          <p className="text-xs text-muted mt-2">
            Submitted {formatDate(submission.submittedAt)}
            {submission.isLate ? ' (late)' : ''}
          </p>
          {submission.textAnswer && (
            <p className="text-xs text-muted mt-2 whitespace-pre-wrap">Your answer: {submission.textAnswer}</p>
          )}
          {submission.fileUrl && (
            <a
              href={submission.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-1 text-xs text-primary-600 hover:text-primary-700"
            >
              📎 {submission.fileName ?? 'Your file'}
            </a>
          )}
        </div>
      )}

      {/* Not graded yet: submit / resubmit form */}
      {status !== 'graded' && (
        <div className="mt-4 border-t border-border pt-4">
          {submission && (
            <p className="text-xs text-muted mb-2">
              Submitted {formatDate(submission.submittedAt)}
              {submission.isLate ? ' (late)' : ''}. You can resubmit until it is graded.
              {submission.fileUrl && (
                <>
                  {' '}
                  Current file:{' '}
                  <a
                    href={submission.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary-600 hover:text-primary-700"
                  >
                    {submission.fileName ?? 'file'}
                  </a>
                </>
              )}
            </p>
          )}

          <textarea
            placeholder="Write your answer (optional if you attach a file)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className={inputClass}
          />
          <input
            key={fileInputKey}
            type="file"
            accept={ATTACHMENT_ACCEPT}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-2 w-full text-xs text-muted file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface-strong file:text-text hover:file:bg-surface-high"
          />
          <p className="text-xs text-muted mt-1">PDF, DOC, DOCX, PPT, PPTX, TXT, ZIP, PNG or JPG — max 25 MB.</p>

          {submitMutation.isError && (
            <p className="text-xs text-red-500 mt-2">
              {getErrorMessage(submitMutation.error, 'Could not submit. Please try again.')}
            </p>
          )}
          {submitMutation.isSuccess && <p className="text-xs text-secondary-600 mt-2">Submitted.</p>}

          <button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || !canSubmit}
            className="mt-3 bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-5 py-2 rounded-full text-xs font-semibold disabled:opacity-50"
          >
            {submitMutation.isPending ? 'Submitting...' : submission ? 'Resubmit' : 'Submit'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function StudentAssignments() {
  const [filter, setFilter] = useState<Filter>('all');

  const assignmentsQuery = useQuery({
    queryKey: ['student-assignments'],
    queryFn: async () => (await api.get<StudentAssignment[]>('/student/assignments')).data,
  });

  const assignments = assignmentsQuery.data ?? [];
  const visible = assignments.filter((a) => filter === 'all' || statusOf(a) === filter);

  return (
    <DashboardLayout sidebarSections={studentSidebarSections}>
      <h1 className="text-3xl font-bold text-text mb-1">Assignments</h1>
      <p className="text-muted mb-6">Track and submit work for the courses you're enrolled in.</p>

      <div className="flex items-center gap-1 bg-surface-strong rounded-full p-0.5 w-fit mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={[
              'text-xs font-medium px-4 py-1.5 rounded-full transition',
              filter === f.key ? 'bg-surface text-text shadow-soft' : 'text-muted hover:text-text',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="max-w-2xl space-y-4">
        {assignmentsQuery.isLoading && <p className="text-sm text-muted">Loading assignments...</p>}
        {assignmentsQuery.isError && <p className="text-sm text-red-500">Couldn't load your assignments.</p>}

        {!assignmentsQuery.isLoading && assignments.length === 0 && (
          <p className="text-sm text-muted">No assignments yet in your enrolled courses.</p>
        )}
        {assignments.length > 0 && visible.length === 0 && (
          <p className="text-sm text-muted">Nothing in this filter.</p>
        )}

        {visible.map((assignment) => (
          // key includes submittedAt so the form resets to the saved answer after a (re)submit
          <AssignmentCard key={`${assignment.id}-${assignment.submission?.submittedAt ?? 'none'}`} assignment={assignment} />
        ))}
      </div>
    </DashboardLayout>
  );
}