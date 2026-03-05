import React, { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Globe, Shield, Home, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserGroups } from '@/hooks/user/useGroups';
import { SidebarHeader } from './SidebarHeader';
import { SidebarUserInfo } from './SidebarUserInfo';
import { SidebarSectionTitle } from './SidebarSectionTitle';
import { SidebarNavButton } from './SidebarNavButton';
import { regularUserNav, groupAdminNav } from './navConfig';

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const params = useParams<{ groupId?: string }>();
  const { user, signOut } = useAuth();

  const { data: allGroups = [] } = useUserGroups();
  const adminGroups = allGroups.filter((g) =>
    user?.groups?.some((ug) => ug.groupId === g.id && ug.isAdmin)
  );

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + '/');

  const closeMobile = () => setMobileOpen(false);
  const isInGroupAdmin = pathname.startsWith('/group-admin') && !!params?.groupId;
  const currentGroupId = params?.groupId;

  const getUserStatus = () => {
    if (user?.isGlobalAdmin) return { label: 'מנהל מערכת', icon: Globe, color: 'text-red-500' };
    if (adminGroups.length > 0) {
      if (isInGroupAdmin) {
        const groupName = allGroups.find((g) => g.id === currentGroupId)?.displayName ?? '';
        return { label: `מנהל ${groupName}`, icon: Shield, color: 'text-orange-400' };
      }
      return { label: `מנהל ${adminGroups.length} קבוצות`, icon: Shield, color: 'text-orange-400' };
    }
    return { label: 'משתמש רגיל', icon: null, color: 'text-gray-400' };
  };

  return (
    <>
      {/* Mobile hamburger */}
      <div className="md:hidden fixed top-4 right-4 z-50">
        <button
          type="button"
          className="bg-gray-800 border border-gray-600 text-white hover:bg-gray-700 p-2 rounded"
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed z-50 top-0 right-0 h-full w-64 bg-gray-900 border-l border-gray-700
          flex flex-col shadow-lg transition-transform duration-300 ease-in-out
          md:sticky md:top-0 md:h-screen md:translate-x-0 md:flex-shrink-0
          ${mobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}
        dir="rtl"
      >
        <SidebarHeader />

        <SidebarUserInfo
          user={user}
          status={getUserStatus()}
          onNotificationsClick={() => alert('מערכת ההתראות תהיה זמינה בקרוב')}
        />

        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Inside a specific group admin view */}
          {isInGroupAdmin && currentGroupId && (
            <>
              <SidebarSectionTitle icon={Shield} color="text-orange-500" title="ניהול קבוצה" />
              {groupAdminNav(currentGroupId).map((item) => (
                <SidebarNavButton
                  key={item.path}
                  path={item.path}
                  active={isActive(item.path)}
                  icon={item.icon}
                  label={item.label}
                  colorActive="from-orange-500 to-orange-600"
                  onClick={closeMobile}
                />
              ))}

              {/* Switch to another admin group */}
              {adminGroups.filter((g) => g.id !== currentGroupId).length > 0 && (
                <>
                  <hr className="border-gray-700 my-2" />
                  <SidebarSectionTitle
                    icon={Shield}
                    color="text-orange-400"
                    title="ניהול קבוצות נוספות"
                  />
                  {adminGroups
                    .filter((g) => g.id !== currentGroupId)
                    .map((g) => (
                      <SidebarNavButton
                        key={g.id}
                        path={`/group-admin/${g.id}/dashboard`}
                        active={pathname.startsWith(`/group-admin/${g.id}`)}
                        icon={Shield}
                        label={g.displayName}
                        colorActive="from-orange-400 to-orange-500"
                        onClick={closeMobile}
                      />
                    ))}
                </>
              )}

              {/* Back to user view */}
              <div className="mt-2">
                <SidebarNavButton
                  path="/user/dashboard"
                  active={false}
                  icon={Home}
                  label="חזרה למסך הראשי"
                  colorActive="from-gray-500 to-gray-700"
                  onClick={closeMobile}
                  className="w-full flex items-center px-4 py-2 rounded-lg text-sm font-medium border border-blue-500 text-blue-400 hover:bg-blue-900/60"
                />
              </div>
            </>
          )}

          {/* Regular user view (shown for all roles including global admin) */}
          {!isInGroupAdmin && (
            <>
              <SidebarSectionTitle icon={Home} color="text-blue-500" title="כללי" />
              {regularUserNav.map((item) => (
                <SidebarNavButton
                  key={item.path}
                  path={item.path}
                  active={isActive(item.path)}
                  icon={item.icon}
                  label={item.label}
                  colorActive="from-blue-500 to-blue-600"
                  onClick={closeMobile}
                />
              ))}

              {adminGroups.length > 0 && (
                <>
                  <hr className="border-gray-700 my-2" />
                  <SidebarSectionTitle icon={Shield} color="text-orange-500" title="ניהול קבוצות" />
                  {adminGroups.map((g) => (
                    <SidebarNavButton
                      key={g.id}
                      path={`/group-admin/${g.id}/dashboard`}
                      active={pathname.startsWith(`/group-admin/${g.id}`)}
                      icon={Shield}
                      label={g.displayName}
                      colorActive="from-orange-500 to-orange-600"
                      onClick={closeMobile}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-700">
          <button
            type="button"
            className="w-full flex items-center px-4 py-2 rounded-lg text-red-400 hover:bg-red-900/20 hover:text-red-300 text-sm font-medium"
            onClick={() => {
              signOut();
              closeMobile();
            }}
          >
            <LogOut className="w-5 h-5 ml-3" />
            התנתק
          </button>
        </div>
      </aside>
    </>
  );
}
