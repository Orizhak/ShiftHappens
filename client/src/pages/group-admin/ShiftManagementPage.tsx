import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, List, Trash2, XCircle, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { useGroupShifts, useUpdateShift, useDeleteShift } from '@/hooks/groupAdmin/useGroupShifts';
import { useGroupUsers } from '@/hooks/groupAdmin/useGroupUsers';
import { Shift, ShiftStatus } from '@/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SearchInput } from '@/components/ui/SearchInput';
import { ShiftDetailDialog } from '@/components/ui/ShiftDetailDialog';
import { toast } from 'sonner';

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

const STATUS_TABS = [
  { key: 'all', label: 'הכל' },
  { key: String(ShiftStatus.Active), label: 'פעילות' },
  { key: String(ShiftStatus.Finished), label: 'הושלמו' },
  { key: String(ShiftStatus.Cancelled), label: 'בוטלו' },
];

export function ShiftManagementPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { data: shifts = [], isLoading } = useGroupShifts(groupId!);
  const { data: groupUsers = [] } = useGroupUsers(groupId!);
  const updateShift = useUpdateShift(groupId!);
  const deleteShift = useDeleteShift(groupId!);

  const userNames = useMemo(() => {
    const map: Record<string, string> = {};
    groupUsers.forEach((u: any) => { map[u.id] = u.name || u.displayName || u.username || u.id; });
    return map;
  }, [groupUsers]);

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [dayShiftsDialog, setDayShiftsDialog] = useState<Shift[] | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = getDaysInMonth(year, month);
  const todayStr = new Date().toDateString();

  const filtered = useMemo(() => {
    let result = shifts;
    if (statusFilter !== 'all') {
      result = result.filter(s => String(s.status) === statusFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.displayName.toLowerCase().includes(q) || (s.location && s.location.toLowerCase().includes(q))
      );
    }
    return result.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [shifts, statusFilter, searchQuery]);

  const getShiftsForDay = (day: number) => {
    const d = new Date(year, month, day).toDateString();
    return shifts.filter((s) => new Date(s.startDate).toDateString() === d);
  };

  const navigateMonth = (dir: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1));
      return d;
    });
  };

  const handleCancel = async (e: React.MouseEvent, shiftId: string) => {
    e.stopPropagation();
    await updateShift.mutateAsync({ shiftId, data: { status: ShiftStatus.Cancelled } });
    toast.success('המשמרת בוטלה');
  };

  const handleFinish = async (e: React.MouseEvent, shiftId: string) => {
    e.stopPropagation();
    await updateShift.mutateAsync({ shiftId, data: { status: ShiftStatus.Finished } });
    toast.success('המשמרת הושלמה ונקודות חולקו');
  };

  const handleDelete = async (e: React.MouseEvent, shiftId: string) => {
    e.stopPropagation();
    await deleteShift.mutateAsync(shiftId);
    setConfirmDelete(null);
  };

  return (
    <div className="page-bg" dir="rtl">
      <PageHeader
        icon={<Calendar className="w-5 h-5 text-white" />}
        title="ניהול משמרות"
        subtitle="צפייה, עריכה וביטול משמרות"
        actions={
          <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors ${viewMode === 'list' ? 'bg-blue-500/80 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <List className="w-4 h-4" />
              רשימה
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors ${viewMode === 'calendar' ? 'bg-blue-500/80 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <Calendar className="w-4 h-4" />
              לוח שנה
            </button>
          </div>
        }
      />

      <div className="container mx-auto px-4 py-8 space-y-6">
        {viewMode === 'list' ? (
          <>
            {/* Filters */}
            <div className="space-y-3">
              <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="חיפוש לפי שם או מיקום..." />
              <div className="flex gap-2">
                {STATUS_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      statusFilter === tab.key
                        ? 'bg-blue-500/80 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shifts list */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-gray-500 py-16">אין משמרות</div>
            ) : (
              <div className="space-y-3">
                {filtered.map((shift: Shift) => (
                  <GlassCard
                    key={shift.id}
                    className="p-4 cursor-pointer"
                    hover
                    onClick={() => setSelectedShift(shift)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-white">{shift.displayName}</h3>
                          <StatusBadge type="shift-status" value={shift.status} />
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span>{new Date(shift.startDate).toLocaleDateString('he-IL')}</span>
                          {shift.location && <span>{shift.location}</span>}
                          <span>{shift.users?.length ?? 0} משתמשים</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {shift.status === ShiftStatus.Active && (
                          <>
                            <button
                              onClick={(e) => handleFinish(e, shift.id)}
                              className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                              title="סיים משמרת"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleCancel(e, shift.id)}
                              className="p-2 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                              title="בטל"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {shift.status === ShiftStatus.Cancelled && (
                          <>
                            {confirmDelete === shift.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => handleDelete(e, shift.id)}
                                  className="px-2 py-1 text-xs bg-red-500/20 text-red-300 rounded"
                                >
                                  אישור
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}
                                  className="px-2 py-1 text-xs bg-white/5 text-gray-400 rounded"
                                >
                                  ביטול
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmDelete(shift.id); }}
                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="מחק"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Calendar view */
          <GlassCard className="overflow-hidden">
            {/* Month navigation */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <button onClick={() => navigateMonth('prev')} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 border border-white/10 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
              <h2 className="text-xl font-bold text-white">
                {HEBREW_MONTHS[month]} {year}
              </h2>
              <button onClick={() => navigateMonth('next')} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 border border-white/10 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 px-3 pt-3 pb-1">
              {HEBREW_DAYS.map((d) => (
                <div key={d} className="p-2 text-center text-xs sm:text-sm font-medium text-gray-400 bg-white/5 rounded">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1 p-3 pt-1">
              {days.map((day, i) => {
                if (!day) {
                  return <div key={`empty-${i}`} className="min-h-[60px] sm:min-h-[90px] bg-white/[0.02] rounded-lg border border-white/5" />;
                }

                const dayDate = new Date(year, month, day);
                const isToday = dayDate.toDateString() === todayStr;
                const dayShifts = getShiftsForDay(day);
                const hasActive = dayShifts.some(s => s.status === ShiftStatus.Active);
                const hasFinished = dayShifts.some(s => s.status === ShiftStatus.Finished);

                let cellClass = 'bg-white/[0.03] border-white/5 hover:bg-white/[0.08]';
                if (hasActive) cellClass = 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15';
                else if (hasFinished) cellClass = 'bg-green-500/10 border-green-500/20 hover:bg-green-500/15';

                const ringClass = isToday ? 'ring-2 ring-blue-500/60' : '';

                return (
                  <div
                    key={`day-${day}`}
                    className={`relative min-h-[60px] sm:min-h-[90px] p-1 sm:p-2 border rounded-lg transition-colors cursor-pointer select-none ${cellClass} ${ringClass}`}
                    onClick={() => {
                      if (dayShifts.length === 1) setSelectedShift(dayShifts[0]);
                      else if (dayShifts.length > 1) setDayShiftsDialog(dayShifts);
                    }}
                  >
                    <div className={`text-xs sm:text-sm mb-1 ${isToday ? 'text-blue-400 font-bold' : 'text-gray-300'}`}>
                      {day}
                    </div>
                    {dayShifts.length > 0 && (
                      <div className="space-y-0.5 overflow-hidden">
                        {dayShifts.slice(0, 2).map((s) => {
                          const statusColor = s.status === ShiftStatus.Active
                            ? 'bg-blue-500/15 border-blue-500/25 text-blue-300'
                            : s.status === ShiftStatus.Finished
                              ? 'bg-green-500/15 border-green-500/25 text-green-300'
                              : 'bg-red-500/15 border-red-500/25 text-red-300';
                          return (
                            <div key={s.id} className={`text-xs p-0.5 sm:p-1 rounded border ${statusColor} truncate`}>
                              <span className="truncate block text-[10px] sm:text-xs">{s.displayName}</span>
                            </div>
                          );
                        })}
                        {dayShifts.length > 2 && (
                          <div className="text-[10px] text-gray-500">+{dayShifts.length - 2} עוד</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 px-4 pb-4 pt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-blue-500/30 border border-blue-500/40" />
                <span className="text-xs text-gray-400">פעילה</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-green-500/30 border border-green-500/40" />
                <span className="text-xs text-gray-400">הושלמה</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-red-500/30 border border-red-500/40" />
                <span className="text-xs text-gray-400">בוטלה</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full ring-2 ring-blue-500/60 bg-transparent" />
                <span className="text-xs text-gray-400">היום</span>
              </div>
            </div>
          </GlassCard>
        )}
      </div>

      {/* Day shifts picker (when multiple shifts on same day) */}
      {dayShiftsDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDayShiftsDialog(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md glass-card border-blue-500/20 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">משמרות ביום {new Date(dayShiftsDialog[0].startDate).toLocaleDateString('he-IL')}</h2>
            <div className="space-y-2">
              {dayShiftsDialog.map((s) => (
                <GlassCard
                  key={s.id}
                  hover
                  className="p-3 cursor-pointer"
                  onClick={() => { setDayShiftsDialog(null); setSelectedShift(s); }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-white">{s.displayName}</h3>
                        <StatusBadge type="shift-status" value={s.status} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(s.startDate).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} - {new Date(s.endDate).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        {s.location && ` · ${s.location}`}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">{s.users?.length ?? 0} משתמשים</span>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      {selectedShift && (
        <ShiftDetailDialog
          shift={selectedShift}
          onClose={() => setSelectedShift(null)}
          userNames={userNames}
        />
      )}
    </div>
  );
}
