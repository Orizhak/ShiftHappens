import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

interface BaseProps {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

type GlassInputProps = BaseProps & InputHTMLAttributes<HTMLInputElement> & { as?: 'input' };
type GlassSelectProps = BaseProps & SelectHTMLAttributes<HTMLSelectElement> & { as: 'select'; children: ReactNode };
type GlassTextareaProps = BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { as: 'textarea' };

type Props = GlassInputProps | GlassSelectProps | GlassTextareaProps;

export function GlassInput(props: Props) {
  const { label, error, icon, as = 'input', className = '', ...rest } = props as any;

  const inputClass = `glass-input ${icon ? 'pr-10' : ''} ${className}`;

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>}
      <div className="relative">
        {icon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{icon}</span>
        )}
        {as === 'select' ? (
          <select className={inputClass} {...rest}>{(props as GlassSelectProps).children}</select>
        ) : as === 'textarea' ? (
          <textarea className={`${inputClass} resize-none`} {...rest} />
        ) : (
          <input className={inputClass} {...rest} />
        )}
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
