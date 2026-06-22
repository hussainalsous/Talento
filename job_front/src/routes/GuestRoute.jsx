import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../app/useAuthStore';
import { LoadingScreen } from '../components/feedback/LoadingScreen';

/**
 * Wraps public routes (login, forgot-password).
 * Redirects authenticated users to their dashboard.
 */
export function GuestRoute({ children }) {
  const { isAuthenticated, initializing, getRole } = useAuthStore();
  console.log('[AUTH] GuestRoute render', { isAuthenticated, initializing });

  if (initializing) return <LoadingScreen />;

  if (isAuthenticated) {
    const role = getRole();
    if (role === 'admin' || role === 'super_admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (role === 'job_seeker') {
      return <Navigate to="/job-seeker/profile" replace />;
    }
    return <Navigate to="/company/dashboard" replace />;
  }

  return children;
}
