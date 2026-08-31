import type { Course } from './course'; // reuses the existing Course type

export interface Enrollment { // shape of one enrollment as returned by the backend
  id: string;
  studentId: string;
  courseId: string;
  status: 'active'; // matches the backend's EnrollmentStatus enum
  enrolledAt: string;
  course: Course; // the full course object, nested — thanks to eager: true on the backend entity
}