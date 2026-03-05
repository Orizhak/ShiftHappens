import {
  Calendar, Users, ClipboardList, Settings, Archive,
  BarChart3, Plus, Globe, UserCog, FileText,
} from 'lucide-react';

export const regularUserNav = [
  { label: 'לוח בקרה', path: '/user/dashboard', icon: BarChart3 },
  { label: 'לוח שנה', path: '/user/calendar', icon: Calendar },
  { label: 'היסטוריית משמרות', path: '/user/shift-history', icon: Archive },
  { label: 'בקשות', path: '/user/requests', icon: ClipboardList },
  { label: 'נקודות', path: '/user/points', icon: Users },
];

export const groupAdminNav = (groupId: string) => [
  { label: 'לוח בקרה', path: `/group-admin/${groupId}/dashboard`, icon: BarChart3 },
  { label: 'משמרות', path: `/group-admin/${groupId}/shifts`, icon: Calendar },
  { label: 'יצירת משמרת', path: `/group-admin/${groupId}/CreateShift`, icon: Plus },
  { label: 'בקשות', path: `/group-admin/${groupId}/requests`, icon: ClipboardList },
  { label: 'נקודות', path: `/group-admin/${groupId}/points`, icon: BarChart3 },
  { label: 'תבניות', path: `/group-admin/${groupId}/templates`, icon: FileText },
  { label: 'ניהול משתמשים', path: `/group-admin/${groupId}/usersManagement`, icon: Users },
];

export const globalAdminNav = [
  { label: 'ניהול משתמשים', path: '/global-admin/usersManagement', icon: UserCog },
  { label: 'יצירת משתמש', path: '/global-admin/create-user', icon: Plus },
  { label: 'ניהול קבוצות', path: '/global-admin/groups', icon: Globe },
  { label: 'הגדרות מערכת', path: '/global-admin/settings', icon: Settings },
];
