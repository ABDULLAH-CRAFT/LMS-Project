export interface Lesson { // shape of a lesson from the backend
  id: string;
  moduleId: string;
  title: string;
  contentType: 'text' | 'video'; // matches LessonContentType enum
  content: string;
  order: number;
}

export interface CourseModuleWithLessons { // shape of a module, including its nested lessons array
  id: string;
  courseId: string;
  title: string;
  order: number;
  lessons: Lesson[]; // attached by the backend's getCurriculum method
}

export interface LessonResource { // a lecture-notes file attached to a lesson
  id: string;
  courseId: string;
  lessonId: string;
  title: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface Assignment { // an assignment attached to a lesson
  id: string;
  courseId: string;
  lessonId: string;
  title: string;
  description: string;
  dueDate: string | null; // ISO string, or null when there is no deadline
  maxMarks: number;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: string;
  updatedAt: string;
}