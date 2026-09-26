export interface Course { // shape of a course as returned by the backend
  id: string;
  title: string;
  description: string;
  price: number;
  status: 'draft' | 'published'; // matches the CourseStatus enum on the backend
  teacherId: string;
  coverImageUrl?: string | null; // NEW — set from an uploaded image; null/missing = show the gradient placeholder
  createdAt: string;
}

export interface CreateCoursePayload { // shape of what we SEND when creating a course
  title: string;
  description: string;
  price: number;
  coverImageUrl?: string; // NEW — optional
}

// NEW — one row of GET /courses/mine/overview: a course plus its counts
export interface TeacherCourseSummary extends Course {
  studentCount: number;
  lessonCount: number;
}

// NEW — response of GET /courses/mine/overview (powers the teacher dashboard, drafts and published pages)
export interface TeacherOverview {
  totals: {
    courses: number;
    published: number;
    drafts: number;
    students: number;
    lessons: number;
  };
  courses: TeacherCourseSummary[];
}
