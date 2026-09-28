export interface Course { // shape of a course as returned by the backend
  id: string;
  title: string;
  description: string;
  price: number;
  status: 'draft' | 'published'; // matches the CourseStatus enum on the backend
  teacherId: string;
  coverImageUrl?: string | null; // optional cover image, null/undefined = none set
  createdAt: string;
}

export interface CreateCoursePayload { // shape of what we SEND when creating a course
  title: string;
  description: string;
  price: number;
}

// One row of GET /courses/mine/overview — a Course plus its counts.
export interface TeacherCourseOverview extends Course {
  studentCount: number; // students enrolled in this course
  lessonCount: number; // lessons across all of this course's modules
}

// Full response of GET /courses/mine/overview — powers the teacher dashboard.
export interface TeacherOverview {
  courses: TeacherCourseOverview[];
  totals: {
    totalCourses: number;
    totalStudents: number; // distinct students across all this teacher's courses
    totalLessons: number;
  };
}