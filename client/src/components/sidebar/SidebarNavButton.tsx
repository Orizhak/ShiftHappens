import React from 'react';
import { Link } from 'react-router-dom';

interface Props {
  path: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  colorActive: string;
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
}

export function SidebarNavButton({
  path,
  active,
  icon: Icon,
  label,
  onClick,
  colorActive,
  className,
  variant,
}: Props) {
  const baseClass = className
    ? className
    : `w-full flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? `bg-gradient-to-r ${colorActive} text-white shadow`
          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
      }`;

  return (
    <Link to={path} onClick={onClick} className="block">
      <button type="button" className={baseClass}>
        <Icon className="w-5 h-5 ml-3 flex-shrink-0" />
        {label}
      </button>
    </Link>
  );
}
