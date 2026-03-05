import React from 'react';
import { Bell } from 'lucide-react';

interface Props {
  user: { name?: string } | null;
  status: { label: string; icon: React.ComponentType<{ className?: string }> | null; color: string };
  onNotificationsClick: () => void;
}

export function SidebarUserInfo({ user, status, onNotificationsClick }: Props) {
  const StatusIcon = status.icon;

  return (
    <div className="p-4 border-b border-gray-700 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-white truncate">{user?.name || 'משתמש'}</p>
        <div className={`flex items-center space-x-1 space-x-reverse ${status.color}`}>
          <p className="text-xs">{status.label}</p>
          {StatusIcon && <StatusIcon className="w-3 h-3" />}
        </div>
      </div>
      <button
        type="button"
        onClick={onNotificationsClick}
        className="relative text-gray-400 hover:text-white hover:bg-gray-800 p-2 rounded"
      >
        <Bell className="w-4 h-4" />
        <span className="absolute -top-0.5 -left-0.5 bg-orange-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
          3
        </span>
      </button>
    </div>
  );
}
