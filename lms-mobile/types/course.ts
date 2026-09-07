export enum CourseStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
}

export interface Course {
  id: string;
  title: string;
  description: string;
  price: string; // TypeORM returns decimal columns as strings
  status: CourseStatus;
  teacherId: string;
  createdAt: string;
}

export enum EnrollmentStatus {
  ACTIVE = "active",
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  course: Course;
  status: EnrollmentStatus;
  enrolledAt: string;
}

export enum LessonContentType {
  TEXT = "text",
  VIDEO = "video",
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  contentType: LessonContentType;
  content: string;
  order: number;
}

export interface CourseModuleWithLessons {
  id: string;
  courseId: string;
  title: string;
  order: number;
  lessons: Lesson[];
}