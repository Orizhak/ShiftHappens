import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  accent?: 'blue' | 'green' | 'amber' | 'orange';
  subtitle?: string;
}

const accentStyles = {
  blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20',
  green: 'from-green-500/20 to-green-600/5 border-green-500/20',
  amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20',
  orange: 'from-orange-500/20 to-orange-600/5 border-orange-500/20',
};

const valueColors = {
  blue: 'text-blue-400',
  green: 'text-green-400',
  amber: 'text-amber-400',
  orange: 'text-orange-400',
};

export function StatCard({ label, value, icon, accent = 'blue', subtitle }: StatCardProps) {
  return (
    <div className={`glass-card bg-gradient-to-br ${accentStyles[accent]} p-5`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-400">{label}</p>
        {icon && <span className="text-gray-500">{icon}</span>}
      </div>
      <p className={`text-3xl font-bold ${valueColors[accent]}`}>{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1.5">{subtitle}</p>
      )}
    </div>
  );
}
