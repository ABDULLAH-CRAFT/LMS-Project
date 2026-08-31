import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import LandingPage from './pages/Landing';
import LoginPage from './pages/login';
import RegisterPage from './pages/Register';

import AdminDashboard from './pages/AdminDashboard'; 
import TeacherDrafts from './pages/TeacherDrafts';
import TeacherPublished from './pages/TeacherPublished';
import TeacherProfile from './pages/TeacherProfile';
import TeacherCourseEditor from './pages/TeacherCourseEditor';
import StudentDashboard from './pages/StudentDashboard';
import StudentMyCourses from './pages/StudentMyCourse';
import ProtectedRoute from './components/ProtectedRoute';
import CourseDetail from './pages/CourseDetail';
import StudentProfile from './pages/StudentProfile';
import StudentAssignments from './pages/StudentAssignments'; // NEW
import StudentMessages from './pages/StudentMessages'; // NEW
import StudentSettings from './pages/StudentSettings'; // NEW
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>

          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Public course detail page */}
          <Route
            path="/courses/:id"
            element={<CourseDetail />}
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Teacher */}
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

          {/* Teacher course editor */}
          <Route
            path="/teacher/courses/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherCourseEditor />
              </ProtectedRoute>
            }
          />

          {/* Student */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
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
            path="/student/profile" // this path already existed as a dummy sidebar link — now it has a real page
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
    </QueryClientProvider>
  );
}