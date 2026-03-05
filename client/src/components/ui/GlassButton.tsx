import { ButtonHTMLAttributes, ReactNode } from 'react';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'green';
  icon?: ReactNode;
  children: ReactNode;
}

const variants = {
  primary: 'glass-button-primary',
  green: 'px-4 py-2.5 rounded-lg font-medium text-white transition-all bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-[0_0_20px_rgba(34,197,94,0.3)]',
  secondary: 'px-4 py-2.5 rounded-lg font-medium text-gray-300 transition-all bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white',
  danger: 'px-4 py-2.5 rounded-lg font-medium text-white transition-all bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-[0_0_20px_rgba(239,68,68,0.3)]',
  ghost: 'px-4 py-2.5 rounded-lg font-medium text-gray-400 transition-all hover:bg-white/5 hover:text-white',
};

export function GlassButton({ variant = 'primary', icon, children, className = '', ...props }: GlassButtonProps) {
  return (
    <button className={`${variants[variant]} disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`} {...props}>
      {icon}
      {children}
    </button>
  );
}
