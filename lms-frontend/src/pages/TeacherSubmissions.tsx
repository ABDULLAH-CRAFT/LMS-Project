import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { Course } from '../types/course';
import type { Assignment } from '../types/courseContent';
import type { SubmissionListResponse, SubmissionSummary, TeacherSubmission } from '../types/submission';
import DashboardLayout from '../components/DashboardLayout';
import { teacherSidebarSections } from '../config/teacherSidebar';

const inputClass =
  'w-full bg-surface-strong border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition';

function getErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message ?? fallback;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function GradeForm({
  courseId,
  submission,
  maxMarks,
}: {
  courseId: string;
  submission: TeacherSubmission;
  maxMarks: number;
}) {
  const queryClient = useQueryClient();
  const [grade, setGrade] = useState(submission.grade !== null ? String(submission.grade) : '');
  const [feedback, setFeedback] = useState(submission.feedback ?? '');

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await api.patch(`/courses/${courseId}/submissions/${submission.id}/grade`, {
        grade: Number(grade),
        feedback: feedback.trim() || undefined,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions', courseId] });
      queryClient.invalidateQueries({ queryKey: ['submission-summary', courseId] });
    },
  });

  const gradeNumber = Number(grade);
  const isValid = grade !== '' && Number.isInteger(gradeNumber) && gradeNumber >= 0 && gradeNumber <= maxMarks;

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      <div className="flex items-end gap-3 mb-2">
        <label className="text-xs text-muted w-32">
          Marks (max {maxMarks})
          <input
            type="number"
            min={0}
            max={maxMarks}
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>
        {submission.gradedAt && (
          <span className="text-xs text-secondary-600 bg-secondary-100 px-2.5 py-1 rounded-full font-medium mb-1">
            Graded {formatDate(submission.gradedAt)}
          </span>
        )}
      </div>

      <textarea
        placeholder="Feedback for the student (optional)"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        rows={3}
        className={inputClass}
      />

      {mutation.isError && (
        <p className="text-xs text-red-500 mt-2">{getErrorMessage(mutation.error, 'Could not save the grade.')}</p>
      )}
      {mutation.isSuccess && <p className="text-xs text-secondary-600 mt-2">Saved.</p>}

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !isValid}
        className="mt-2 bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
      >
        {mutation.isPending ? 'Saving...' : submission.gradedAt ? 'Update grade' : 'Save grade'}
      </button>
    </div>
  );
}

export default function TeacherSubmissions() {
  const { id: courseId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('assignment');

  const courseQuery = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => (await api.get<Course>(`/courses/${courseId}`)).data,
    enabled: !!courseId,
  });

  // same query key as LessonAssignments, so it is shared from cache
  const assignmentsQuery = useQuery({
    queryKey: ['assignments', courseId],
    queryFn: async () => (await api.get<Assignment[]>(`/courses/${courseId}/assignments`)).data,
    enabled: !!courseId,
  });

  const summaryQuery = useQuery({
    queryKey: ['submission-summary', courseId],
    queryFn: async () => (await api.get<SubmissionSummary>(`/courses/${courseId}/submissions/summary`)).data,
    enabled: !!courseId,
  });

  const submissionsQuery = useQuery({
    queryKey: ['submissions', courseId, selectedId],
    queryFn: async () =>
      (await api.get<SubmissionListResponse>(`/courses/${courseId}/assignments/${selectedId}/submissions`)).data,
    enabled: !!courseId && !!selectedId,
  });

  const assignments = assignmentsQuery.data ?? [];
  const summaryByAssignment = new Map((summaryQuery.data?.assignments ?? []).map((row) => [row.assignmentId, row]));
  const enrolledCount = summaryQuery.data?.enrolledCount ?? 0;

  return (
    <DashboardLayout sidebarSections={teacherSidebarSections}>
      <Link
        to={`/teacher/courses/${courseId}/edit`}
        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
      >
        ← Back to course content
      </Link>
      <h1 className="text-3xl font-bold text-text mt-2 mb-1">Submissions</h1>
      <p className="text-muted mb-8">{courseQuery.data?.title ?? 'Review, grade and give feedback.'}</p>

      {assignmentsQuery.isLoading && <p className="text-sm text-muted">Loading assignments...</p>}
      {assignmentsQuery.isError && <p className="text-sm text-red-500">Couldn't load assignments.</p>}

      {!assignmentsQuery.isLoading && assignments.length === 0 && (
        <p className="text-sm text-muted">
          This course has no assignments yet. Add one from the course content page.
        </p>
      )}

      {assignments.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Assignment list */}
          <div className="bg-surface rounded-2xl shadow-soft divide-y divide-border overflow-hidden">
            {assignments.map((assignment) => {
              const row = summaryByAssignment.get(assignment.id);
              const submitted = row?.submittedCount ?? 0;
              const graded = row?.gradedCount ?? 0;
              const isActive = assignment.id === selectedId;
              return (
                <button
                  key={assignment.id}
                  onClick={() => setSearchParams({ assignment: assignment.id })}
                  className={`w-full text-left px-4 py-3 transition ${
                    isActive ? 'bg-primary-500/10' : 'hover:bg-surface-strong/40'
                  }`}
                >
                  <p className="text-sm font-medium text-text truncate">{assignment.title}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {submitted}/{enrolledCount} submitted · {graded} graded
                  </p>
                </button>
              );
            })}
          </div>

          {/* Submissions for the selected assignment */}
          <div className="lg:col-span-2 space-y-4">
            {!selectedId && <p className="text-sm text-muted">Select an assignment to see its submissions.</p>}
            {selectedId && submissionsQuery.isLoading && <p className="text-sm text-muted">Loading submissions...</p>}
            {selectedId && submissionsQuery.isError && (
              <p className="text-sm text-red-500">Couldn't load submissions for this assignment.</p>
            )}

            {submissionsQuery.data && (
              <>
                <div className="bg-surface rounded-2xl shadow-soft p-4">
                  <p className="font-semibold text-text">{submissionsQuery.data.assignment.title}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {submissionsQuery.data.assignment.maxMarks} marks ·{' '}
                    {submissionsQuery.data.assignment.dueDate
                      ? `Due ${formatDate(submissionsQuery.data.assignment.dueDate)}`
                      : 'No deadline'}{' '}
                    · {submissionsQuery.data.submissions.length}/{submissionsQuery.data.enrolledCount} students submitted
                  </p>
                </div>

                {submissionsQuery.data.submissions.length === 0 && (
                  <p className="text-sm text-muted">No submissions yet.</p>
                )}

                {submissionsQuery.data.submissions.map((submission) => (
                  <div key={submission.id} className="bg-surface rounded-2xl shadow-soft p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text">{submission.student?.name ?? 'Unknown student'}</p>
                        <p className="text-xs text-muted">{submission.student?.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted">{formatDate(submission.submittedAt)}</p>
                        {submission.isLate && (
                          <span className="text-[11px] font-medium text-red-500">Late</span>
                        )}
                      </div>
                    </div>

                    {submission.textAnswer && (
                      <p className="mt-3 text-sm text-text whitespace-pre-wrap bg-surface-strong rounded-lg px-3 py-2">
                        {submission.textAnswer}
                      </p>
                    )}
                    {submission.fileUrl && (
                      <a
                        href={submission.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block mt-2 text-xs text-primary-600 hover:text-primary-700"
                      >
                        📎 {submission.fileName ?? 'Attached file'}
                      </a>
                    )}

                    <GradeForm
                      key={`${submission.id}-${submission.gradedAt}`}
                      courseId={courseId as string}
                      submission={submission}
                      maxMarks={submissionsQuery.data.assignment.maxMarks}
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}