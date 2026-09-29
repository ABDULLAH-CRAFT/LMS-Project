import type { Assignment } from './courseContent';

export interface Submission {
  id: string;
  assignmentId: string;
  courseId: string;
  studentId: string;
  textAnswer: string | null;
  fileUrl: string | null;
  fileName: string | null;
  submittedAt: string;
  isLate: boolean;
  grade: number | null;
  feedback: string | null;
  gradedAt: string | null;
}

export interface TeacherSubmission extends Submission {
  student: { id: string; name: string; email: string } | null;
}

// GET /courses/:courseId/assignments/:assignmentId/submissions
export interface SubmissionListResponse {
  assignment: Assignment;
  enrolledCount: number;
  submissions: TeacherSubmission[];
}

// GET /courses/:courseId/submissions/summary
export interface SubmissionSummary {
  enrolledCount: number;
  assignments: { assignmentId: string; submittedCount: number; gradedCount: number }[];
}

// GET /student/assignments — one row per assignment
export interface StudentAssignment {
  id: string;
  courseId: string;
  lessonId: string;
  title: string;
  description: string;
  dueDate: string | null;
  maxMarks: number;
  attachmentUrl: string | null;
  attachmentName: string | null;
  courseTitle: string;
  lessonTitle: string;
  submission: Submission | null;
}