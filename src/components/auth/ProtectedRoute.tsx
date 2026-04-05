import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageSkeleton } from '@/components/layout/PageSkeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading } = useAuth();

  if (loading) {
    return <PageSkeleton />;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
