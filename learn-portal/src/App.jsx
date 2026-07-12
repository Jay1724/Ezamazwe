import { Route, Routes } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Catalog from './pages/Catalog.jsx';
import CourseDetail from './pages/CourseDetail.jsx';
import LessonPlayer from './pages/LessonPlayer.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import CourseEditor from './pages/admin/CourseEditor.jsx';

export default function App() {
  return (
    <>
      <NavBar />
      <main className="portal-main">
        <Routes>
          <Route path="/learn/login" element={<Login />} />
          <Route path="/learn/signup" element={<Signup />} />
          <Route
            path="/learn"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/learn/courses" element={<Catalog />} />
          <Route path="/learn/courses/:slug" element={<CourseDetail />} />
          <Route
            path="/learn/courses/:slug/lesson/:lessonId"
            element={
              <ProtectedRoute>
                <LessonPlayer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/learn/admin"
            element={
              <ProtectedRoute requireRole="owner">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/learn/admin/courses/:id"
            element={
              <ProtectedRoute requireRole="owner">
                <CourseEditor />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </>
  );
}
