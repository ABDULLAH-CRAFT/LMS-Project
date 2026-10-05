import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CartProvider } from './context/CartComtext';
import PaymentSuccessToast from './components/PaymentSuccessToast';

import LandingPage from './pages/Landing';
import LoginPage from './pages/login';
import RegisterPage from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import AdminCourses from './pages/AdminCourses'; // NEW
import AdminRevenue from './pages/AdminRevenue'; // R4
import AdminCourseSales from './pages/AdminCourseSales'; // R4
import ComingSoonPage from './components/ComingSoonPage'; // R4/R5 - placeholders
import { adminSidebarSections } from './config/adminSidebar'; // R4
import { teacherSidebarSections } from './config/teacherSidebar'; // R5
import TeacherDrafts from './pages/TeacherDrafts';
import TeacherPublished from './pages/TeacherPublished';
import TeacherProfile from './pages/TeacherProfile';
import TeacherCourseEditor from './pages/TeacherCourseEditor';
import StudentDashboard from './pages/StudentDashboard';
import StudentMyCourses from './pages/StudentMyCourse';
import ProtectedRoute from './components/ProtectedRoute';
import CourseDetail from './pages/CourseDetail';
import StudentProfile from './pages/StudentProfile';
import StudentAssignments from './pages/StudentAssignments';
import StudentMessages from './pages/StudentMessages';
import StudentSettings from './pages/StudentSettings';
import Cart from './pages/Cart';
import StudentCourseLearn from './pages/StudentCourseLearn'; // NEW — add alongside the other page imports
import TeacherDashboard from './pages/TeacherDashboard';
const queryClient = new QueryClient();
import TeacherSubmissions from './pages/TeacherSubmissions';
import TeacherCourseStudents from './pages/TeacherCourseStudents';
import TeacherAnnouncements from './pages/TeacherAnnouncements';
import TeacherEarnings from './pages/TeacherEarnings';
import TeacherCourseEarnings from './pages/TeacherCourseEarnings'; // R5
import TeacherStatements from './pages/TeacherStatements'; // R5
import StudentAnnouncements from './pages/StudentAnnouncements';
import AdminMembership from './pages/AdminMembership'; // R6
import StudentMembership from './pages/StudentMembership'; // R6
import AdminEngagementScores from './pages/AdminEngagementScores'; // R9
import AdminMembershipPeriods from './pages/AdminMembershipPeriods'; // R10
import AdminMembershipAnalytics from './pages/AdminMembershipAnalytics'; // R11

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <PaymentSuccessToast />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/courses/:id" element={<CourseDetail />} />

            <Route
              path="/cart"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <Cart />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/courses"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminCourses />
                </ProtectedRoute>
              }
            />

            {/* R4 — Finance */}
            <Route
              path="/admin/revenue"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminRevenue />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/course-sales"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminCourseSales />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/membership"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminMembership />
                </ProtectedRoute>
              }
            />
              <Route
              path="/admin/engagement"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminEngagementScores />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/membership-periods"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminMembershipPeriods />
                </ProtectedRoute>
              }
            />
                        <Route
              path="/admin/membership-analytics"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminMembershipAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/payouts"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ComingSoonPage
                    sidebarSections={adminSidebarSections}
                    title="Payouts"
                    description="Approve, process and review teacher payouts."
                    icon="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </ProtectedRoute>
              }
            />

            <Route
              path="/teacher"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/drafts"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherDrafts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/published"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherPublished />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/profile"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/courses/:id/edit"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherCourseEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/courses/:id/submissions"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherSubmissions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/courses/:id/students"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherCourseStudents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/announcements"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherAnnouncements />
                </ProtectedRoute>
              }
            />

            {/* R5 — Teacher earnings */}
            <Route
              path="/teacher/earnings"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherEarnings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/earnings/courses"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherCourseEarnings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/earnings/statements"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherStatements />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/earnings/membership"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <ComingSoonPage
                    sidebarSections={teacherSidebarSections}
                    title="Membership Earnings"
                    description="Your share of the monthly membership pool, and how your engagement score is calculated."
                    icon="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/earnings/payouts"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <ComingSoonPage
                    sidebarSections={teacherSidebarSections}
                    title="Payouts"
                    description="Your payout history and the status of each payment to you."
                    icon="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </ProtectedRoute>
              }
            />

            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            {/* NEW — add this Route inside <Routes>, near the other /student/... routes */}
            <Route
              path="/student/courses/:id/learn"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentCourseLearn />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/my-courses"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentMyCourses />
                </ProtectedRoute>
              }
            />
                        <Route
              path="/student/membership"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentMembership />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/profile"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/assignments"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentAssignments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/announcements"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentAnnouncements />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/messages"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentMessages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/settings"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentSettings />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </QueryClientProvider>
  );
}