import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft, Calendar } from 'lucide-react';

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];
const HEBREW_DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

function getDaysInMonth(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function formatHebrew(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface GlassDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  error?: string;
  placeholder?: string;
}

export function GlassDatePicker({
  value,
  onChange,
  label,
  error,
  placeholder = 'בחר תאריך',
}: GlassDatePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });

  const parsed = value ? new Date(value + 'T00:00:00') : null;
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? new Date().getMonth());

  const days = getDaysInMonth(viewYear, viewMonth);
  const todayStr = new Date().toISOString().slice(0, 10);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPopupPos({
      top: rect.bottom + 8,
      left: rect.left,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    function handleClick(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        popupRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    }
    function handleScroll() {
      updatePosition();
    }
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  const navigateMonth = (dir: 'prev' | 'next') => {
    const d = new Date(viewYear, viewMonth + (dir === 'next' ? 1 : -1), 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const selectDay = (day: number) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    onChange(`${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`);
    setOpen(false);
  };

  return (
    <div className="relative">
      {label && <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={`glass-input w-full text-right flex items-center justify-between gap-2 ${!value ? 'text-gray-500' : 'text-white'} ${error ? 'border-red-500/50' : ''}`}
      >
        <span>{value ? formatHebrew(value) : placeholder}</span>
        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}

      {open && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[9999] w-72 glass-card p-3 animate-in fade-in-0 zoom-in-95"
          style={{ top: popupPos.top, left: popupPos.left, animation: 'fadeIn 0.15s ease' }}
        >
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => navigateMonth('prev')} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-white">{HEBREW_MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" onClick={() => navigateMonth('next')} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {HEBREW_DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-gray-500 py-1">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />;
              const pad = (n: number) => String(n).padStart(2, '0');
              const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
              const isSelected = dateStr === value;
              const isToday = dateStr === todayStr;
              return (
                <button
                  key={`d-${day}`}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`h-8 rounded-md text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                      : isToday
                        ? 'bg-white/10 text-blue-400 ring-1 ring-blue-500/40'
                        : 'text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
