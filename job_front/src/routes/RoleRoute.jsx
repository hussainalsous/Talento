import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../app/useAuthStore';

/**
 * Wraps a route so it requires specific roles.
 * Redirects to /unauthorized if the current user's role is not in `roles`.
 */
export function RoleRoute({ children, roles }) {
  const hasRole = useAuthStore((s) => s.hasRole);

  if (!hasRole(roles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
