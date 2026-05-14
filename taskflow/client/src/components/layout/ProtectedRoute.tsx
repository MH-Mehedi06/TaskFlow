import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';

interface Props { requiredRole?: 'client' | 'tasker' | 'admin'; }

export function ProtectedRoute({ requiredRole }: Props) {
  const { user } = useAppSelector((s) => s.auth);
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }
  return <Outlet />;
}
