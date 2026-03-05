import { ReactNode } from 'react';

interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ icon, title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="glass-header sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              {icon}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{title}</h1>
              {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
