import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../app/useAuthStore';
import { LoadingScreen } from '../components/feedback/LoadingScreen';

/**
 * Wraps a route so it requires authentication.
 * Redirects to /login if not authenticated.
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, initializing } = useAuthStore();
  const location = useLocation();
  console.log('[AUTH] ProtectedRoute render', { isAuthenticated, initializing, path: location.pathname });

  if (initializing) return <LoadingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}
