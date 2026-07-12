import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function ProtectedRoute({ children, requireRole }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="page-spinner">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/learn/login" state={{ from: location }} replace />;
  }

  if (requireRole && profile?.role !== requireRole) {
    return <Navigate to="/learn" replace />;
  }

  return children;
}
