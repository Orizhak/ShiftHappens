import { useState, useRef, useEffect } from 'react';
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
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
}

interface GlassDateRangePickerProps {
  startDate: string;
  endDate: string;
  onChangeStart: (date: string) => void;
  onChangeEnd: (date: string) => void;
  label?: string;
  error?: string;
}

export function GlassDateRangePicker({
  startDate,
  endDate,
  onChangeStart,
  onChangeEnd,
  label,
  error,
}: GlassDateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState<'start' | 'end'>('start');
  const ref = useRef<HTMLDivElement>(null);

  const now = new Date();
  const [viewYear, setViewYear] = useState(startDate ? new Date(startDate + 'T00:00:00').getFullYear() : now.getFullYear());
  const [viewMonth, setViewMonth] = useState(startDate ? new Date(startDate + 'T00:00:00').getMonth() : now.getMonth());

  const days = getDaysInMonth(viewYear, viewMonth);
  const todayStr = now.toISOString().slice(0, 10);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const navigateMonth = (dir: 'prev' | 'next') => {
    const d = new Date(viewYear, viewMonth + (dir === 'next' ? 1 : -1), 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const pad = (n: number) => String(n).padStart(2, '0');

  const selectDay = (day: number) => {
    const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
    if (picking === 'start') {
      onChangeStart(dateStr);
      if (endDate && dateStr > endDate) onChangeEnd('');
      setPicking('end');
    } else {
      if (dateStr < startDate) {
        onChangeStart(dateStr);
        onChangeEnd('');
        setPicking('end');
      } else {
        onChangeEnd(dateStr);
        setOpen(false);
        setPicking('start');
      }
    }
  };

  const isInRange = (dateStr: string) => {
    if (!startDate || !endDate) return false;
    return dateStr >= startDate && dateStr <= endDate;
  };

  const displayText = startDate && endDate
    ? `${formatHebrew(startDate)} - ${formatHebrew(endDate)}`
    : startDate
      ? `${formatHebrew(startDate)} - ...`
      : 'בחר טווח תאריכים';

  return (
    <div ref={ref} className="relative">
      {label && <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => { setOpen(!open); setPicking('start'); }}
        className={`glass-input w-full text-right flex items-center justify-between gap-2 ${!startDate ? 'text-gray-500' : 'text-white'} ${error ? 'border-red-500/50' : ''}`}
      >
        <span>{displayText}</span>
        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}

      {open && (
        <div className="absolute z-50 mt-2 w-72 glass-card p-3" style={{ animation: 'fadeIn 0.15s ease' }}>
          {/* Picking indicator */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setPicking('start')}
              className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${picking === 'start' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/5 text-gray-400 border border-white/10'}`}
            >
              מתאריך {startDate ? formatHebrew(startDate) : '...'}
            </button>
            <button
              type="button"
              onClick={() => setPicking('end')}
              className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${picking === 'end' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/5 text-gray-400 border border-white/10'}`}
            >
              עד תאריך {endDate ? formatHebrew(endDate) : '...'}
            </button>
          </div>

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
              const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
              const isStart = dateStr === startDate;
              const isEnd = dateStr === endDate;
              const inRange = isInRange(dateStr);
              const isToday = dateStr === todayStr;
              return (
                <button
                  key={`d-${day}`}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`h-8 rounded-md text-xs font-medium transition-all ${
                    isStart || isEnd
                      ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                      : inRange
                        ? 'bg-blue-500/20 text-blue-300'
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
        </div>
      )}
    </div>
  );
}
