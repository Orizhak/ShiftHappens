import { Outlet, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/sidebar/Sidebar';

/**
 * Group Admin Layout — enforces group admin access at the component level
 * (in addition to the route-level ProtectedRoute wrapper).
 */
export function GroupAdminLayout() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();

  if (!user || !groupId) return null;

  const hasAccess =
    user.isGlobalAdmin ||
    user.groups?.some((g) => g.groupId === groupId && g.isAdmin);

  if (!hasAccess) return <Navigate to="/user/dashboard" replace />;

  return (
    <div className="flex min-h-screen bg-gray-950 text-white" dir="rtl">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
