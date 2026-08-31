export interface Course { // shape of a course as returned by the backend
  id: string;
  title: string;
  description: string;
  price: number;
  status: 'draft' | 'published'; // matches the CourseStatus enum on the backend
  teacherId: string;
  createdAt: string;
}

export interface CreateCoursePayload { // shape of what we SEND when creating a course
  title: string;
  description: string;
  price: number;
}