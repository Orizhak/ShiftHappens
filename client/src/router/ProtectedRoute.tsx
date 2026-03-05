import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SessionUser } from '@/types';

interface Props {
  /** If true, user must be a global admin */
  requireGlobalAdmin?: boolean;
  /** If provided, user must be an admin of this groupId */
  requireGroupAdmin?: string;
  /** Redirect target when access is denied (default: /auth/login) */
  redirectTo?: string;
}

export function ProtectedRoute({
  requireGlobalAdmin,
  requireGroupAdmin,
  redirectTo = '/auth/login',
}: Props) {
  const { user, isLoading } = useAuth();

  // While checking the session, render nothing (avoids flash)
  if (isLoading) return null;

  // Not authenticated
  if (!user) return <Navigate to={redirectTo} replace />;

  // Global admin check
  if (requireGlobalAdmin && !user.isGlobalAdmin) {
    return <Navigate to="/user/dashboard" replace />;
  }

  // Group admin check
  if (requireGroupAdmin) {
    const isGroupAdmin = user.groups?.some(
      (g) => g.groupId === requireGroupAdmin && g.isAdmin
    );
    if (!isGroupAdmin && !user.isGlobalAdmin) {
      return <Navigate to="/user/dashboard" replace />;
    }
  }

  return <Outlet />;
}
