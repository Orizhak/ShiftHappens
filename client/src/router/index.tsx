import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

// Layouts
import { AuthLayout } from '@/layouts/AuthLayout';
import { UserLayout } from '@/layouts/UserLayout';
import { GroupAdminLayout } from '@/layouts/GroupAdminLayout';

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';

// User pages
import { UserDashboardPage } from '@/pages/user/DashboardPage';
import { UserCalendarPage } from '@/pages/user/CalendarPage';
import { UserPointsPage } from '@/pages/user/PointsPage';
import { UserRequestsPage } from '@/pages/user/RequestsPage';
import { UserShiftHistoryPage } from '@/pages/user/ShiftHistoryPage';

// Group Admin pages
import { GroupAdminDashboardPage } from '@/pages/group-admin/DashboardPage';
import { CreateShiftPage } from '@/pages/group-admin/CreateShiftPage';
import { UsersManagementPage } from '@/pages/group-admin/UsersManagementPage';
import { ShiftManagementPage } from '@/pages/group-admin/ShiftManagementPage';
import { RequestManagementPage } from '@/pages/group-admin/RequestManagementPage';
import { PointsManagementPage } from '@/pages/group-admin/PointsManagementPage';
import { TemplatesPage } from '@/pages/group-admin/TemplatesPage';


export function AppRoutes() {
  return (
    <Routes>
      {/* ─── Auth ────────────────────────────────────────────────────────── */}
      <Route element={<AuthLayout />}>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth" element={<Navigate to="/auth/login" replace />} />
      </Route>

      {/* ─── Regular User ─────────────────────────────────────────────────── */}
      <Route element={<ProtectedRoute />}>
        <Route element={<UserLayout />}>
          <Route path="/user/dashboard" element={<UserDashboardPage />} />
          <Route path="/user/calendar" element={<UserCalendarPage />} />
          <Route path="/user/points" element={<UserPointsPage />} />
          <Route path="/user/requests" element={<UserRequestsPage />} />
          <Route path="/user/shift-history" element={<UserShiftHistoryPage />} />
          <Route path="/user" element={<Navigate to="/user/dashboard" replace />} />
        </Route>
      </Route>

      {/* ─── Group Admin ──────────────────────────────────────────────────── */}
      {/*
        NOTE: ProtectedRoute with requireGroupAdmin checks the groupId from the URL.
        We pass it via the layout wrapper below.
      */}
      <Route element={<ProtectedRoute />}>
        <Route path="/group-admin/:groupId" element={<GroupAdminLayout />}>
          <Route path="dashboard" element={<GroupAdminDashboardPage />} />
          <Route path="CreateShift" element={<CreateShiftPage />} />
          <Route path="usersManagement" element={<UsersManagementPage />} />
          <Route path="shifts" element={<ShiftManagementPage />} />
          <Route path="requests" element={<RequestManagementPage />} />
          <Route path="points" element={<PointsManagementPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>
      </Route>

      {/* ─── Root redirect ────────────────────────────────────────────────── */}
      <Route path="/" element={<Navigate to="/user/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/user/dashboard" replace />} />
    </Routes>
  );
}
