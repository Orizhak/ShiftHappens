import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'blue' | 'green' | 'amber' | 'red';
  onClick?: () => void;
}

const glowStyles = {
  blue: 'shadow-[0_0_20px_rgba(59,130,246,0.15)] border-blue-500/20',
  green: 'shadow-[0_0_20px_rgba(34,197,94,0.15)] border-green-500/20',
  amber: 'shadow-[0_0_20px_rgba(245,158,11,0.15)] border-amber-500/20',
  red: 'shadow-[0_0_20px_rgba(239,68,68,0.15)] border-red-500/20',
};

export function GlassCard({ children, className = '', hover, glow, onClick }: GlassCardProps) {
  return (
    <div
      className={`glass-card ${hover ? 'glass-card-hover cursor-pointer' : ''} ${glow ? glowStyles[glow] : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
