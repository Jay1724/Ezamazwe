import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LearnerProfileProvider } from './contexts/LearnerProfileContext';
import { Layout } from './components/Layout';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import { CatalogPage } from './pages/CatalogPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { LessonPlayerPage } from './pages/LessonPlayerPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { AdminCourseListPage } from './pages/admin/AdminCourseListPage';
import { AdminCourseEditPage } from './pages/admin/AdminCourseEditPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LearnerProfileProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<CatalogPage />} />
              <Route path="course/:id" element={<CourseDetailPage />} />
              <Route
                path="course/:id/lesson/:lessonId"
                element={
                  <ProtectedRoute>
                    <LessonPlayerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route path="login" element={<LoginPage />} />
              <Route path="signup" element={<SignupPage />} />

              <Route
                path="admin"
                element={
                  <AdminRoute>
                    <AdminCourseListPage />
                  </AdminRoute>
                }
              />
              <Route
                path="admin/courses/:courseId"
                element={
                  <AdminRoute>
                    <AdminCourseEditPage />
                  </AdminRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </LearnerProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div className="wrap section empty-state">
      <h2>Page not found</h2>
    </div>
  );
}
