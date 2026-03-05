import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (user) return <Navigate to="/user/dashboard" replace />;

  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center relative overflow-hidden" dir="rtl">
      {/* Decorative orbs */}
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-green-500/15 rounded-full blur-[120px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px]" />
      <div className="relative z-10 w-full">
        <Outlet />
      </div>
    </div>
  );
}
