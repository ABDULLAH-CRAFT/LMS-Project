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