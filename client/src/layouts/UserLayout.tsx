import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/sidebar/Sidebar';

export function UserLayout() {
  return (
    <div className="flex min-h-screen bg-[#0b1120]" dir="rtl">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
