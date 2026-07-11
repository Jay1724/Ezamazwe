import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PageSpinner } from './PageSpinner';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageSpinner />;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { session, appUser, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageSpinner />;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  if (appUser?.role !== 'admin') {
    return (
      <div className="wrap section">
        <div className="empty-state">
          <h2>Not authorized</h2>
          <p>This area is only available to Ezamazwe Education admins.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
