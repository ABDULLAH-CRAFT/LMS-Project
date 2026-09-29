export interface CourseStudentRow {
  studentId: string;
  name: string;
  email: string;
  enrolledAt: string;
  completedCount: number;
  percent: number;
  lastActivityAt: string | null;
}

// GET /courses/:courseId/students
export interface CourseStudentsResponse {
  course: { id: string; title: string };
  totalLessons: number;
  summary: { enrolledCount: number; averageProgress: number; completedStudents: number };
  students: CourseStudentRow[];
}

export interface CourseAnnouncement {
  id: string;
  courseId: string;
  teacherId: string;
  title: string;
  message: string;
  createdAt: string;
}

// GET /student/announcements
export interface StudentAnnouncement {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  message: string;
  createdAt: string;
}

// GET /teacher/earnings
export interface EarningsResponse {
  currency: string;
  totals: { revenue: number; salesCount: number; thisMonthRevenue: number; averageOrderValue: number };
  monthly: { month: string; revenue: number; sales: number }[]; // month = "YYYY-MM"
  byCourse: { courseId: string; title: string; salesCount: number; revenue: number }[];
  recentSales: {
    id: string;
    courseTitle: string;
    studentName: string;
    studentEmail: string;
    amount: number;
    paidAt: string;
  }[];
}