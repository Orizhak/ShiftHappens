import { Minus, Plus } from 'lucide-react';

interface NumberStepperProps {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  label,
}: NumberStepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <div>
      {label && <label className="block text-sm text-gray-300 mb-1">{label}</label>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          disabled={value <= min}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-95"
        >
          <Minus className="w-4 h-4" />
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
          min={min}
          max={max}
          className="glass-input w-16 text-center text-sm py-2 px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          disabled={value >= max}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
