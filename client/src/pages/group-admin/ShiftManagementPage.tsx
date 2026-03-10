import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, List, Trash2, XCircle, CheckCircle, ChevronRight, ChevronLeft, X, User, RefreshCw, Check, Zap } from 'lucide-react';
import { useGroupShifts, useUpdateShift, useDeleteShift } from '@/hooks/groupAdmin/useGroupShifts';
import { useGroupUsers } from '@/hooks/groupAdmin/useGroupUsers';
import { useAssignmentCandidates } from '@/hooks/groupAdmin/useAssignment';
import { Shift, ShiftStatus, AssignmentShiftData, UserFitness } from '@/types';
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

// ─── Replace User Dialog ────────────────────────────────────────────────────
interface ReplaceUserDialogProps {
  shift: Shift;
  userToReplace: string | null;
  groupId: string;
  userNames: Record<string, string>;
  onClose: () => void;
  onConfirm: (newUsers: string[]) => void;
}

function ReplaceUserDialog({ shift, userToReplace, groupId, userNames, onClose, onConfirm }: ReplaceUserDialogProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const numSlots = userToReplace ? 1 : shift.users.length;

  // Use original shift categories — same filtering and algorithm as the original assignment
  const shiftData: AssignmentShiftData | null = useMemo(() => {
    const start = new Date(shift.startDate);
    const end = new Date(shift.endDate);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return {
      numUsers: numSlots,
      requiredUserCategories: shift.requiredUserCategories ?? [],
      forbiddenUserCategories: shift.forbiddenUserCategories ?? [],
      startDate: shift.startDate,
      startHour: start.toTimeString().slice(0, 5),
      duration,
    };
  }, [shift, numSlots]);

  const { data: candidatesData, isLoading } = useAssignmentCandidates(groupId, shiftData);

  // Exclude ALL current shift users from the candidates list
  const candidates = useMemo(() => {
    if (!candidatesData?.users) return [];
    const excludeSet = new Set(shift.users);
    return candidatesData.users
      .filter((u: UserFitness) => !excludeSet.has(u.user.id))
      .sort((a: UserFitness, b: UserFitness) => {
        if (a.fitnessScore !== b.fitnessScore) return b.fitnessScore - a.fitnessScore;
        return a.currentPoints - b.currentPoints;
      });
  }, [candidatesData, shift.users]);

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) => {
      if (prev.includes(userId)) return prev.filter((id) => id !== userId);
      if (prev.length >= numSlots) return prev;
      return [...prev, userId];
    });
  };

  const handleAutoAssign = () => {
    const fit = candidates.filter((u: UserFitness) => u.isFit);
    const auto = fit.slice(0, numSlots).map((u: UserFitness) => u.user.id);
    setSelectedUsers(auto);
  };

  const handleConfirm = () => {
    if (selectedUsers.length !== numSlots) return;
    if (userToReplace) {
      const newUsers = shift.users.map((id) => (id === userToReplace ? selectedUsers[0] : id));
      onConfirm(newUsers);
    } else {
      onConfirm(selectedUsers);
    }
  };

  const title = userToReplace
    ? `החלפת ${userNames[userToReplace] ?? userToReplace}`
    : 'החלפת כל המשובצים';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
      <div
        className="relative w-full max-w-lg glass-card border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.15)] p-6 animate-slide-in max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="text-sm text-gray-400">{shift.displayName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auto-assign button */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={handleAutoAssign}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors border border-blue-500/20"
            disabled={isLoading}
          >
            <Zap className="w-3.5 h-3.5" />
            שיבוץ אוטומטי
          </button>
          <span className="text-xs text-gray-500 self-center">
            {selectedUsers.length}/{numSlots} נבחרו
          </span>
        </div>

        {/* Candidates list */}
        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">טוען מועמדים...</div>
          ) : candidates.length === 0 ? (
            <div className="text-center text-gray-500 py-8">לא נמצאו מועמדים</div>
          ) : (
            candidates.map((c: UserFitness) => {
              const isSelected = selectedUsers.includes(c.user.id);
              return (
                <div
                  key={c.user.id}
                  onClick={() => toggleUser(c.user.id)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border ${
                    isSelected
                      ? 'bg-green-500/15 border-green-500/30'
                      : c.isFit
                        ? 'bg-white/5 border-white/10 hover:bg-white/10'
                        : 'bg-red-500/5 border-red-500/10 hover:bg-red-500/10 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-green-500/30' : 'bg-blue-500/20'
                    }`}>
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <User className="w-3 h-3 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <span className="text-sm text-white">{c.user.name}</span>
                      {c.unfitReasons.length > 0 && (
                        <p className="text-xs text-red-400 mt-0.5">{c.unfitReasons.join(', ')}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{c.currentPoints} נק׳</span>
                    <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                      c.fitnessScore >= 70 ? 'bg-green-500/20 text-green-400' :
                      c.fitnessScore >= 40 ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {c.fitnessScore}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Confirm button */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <button
            onClick={handleConfirm}
            disabled={selectedUsers.length !== numSlots}
            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-lg font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            אישור החלפה
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [replaceState, setReplaceState] = useState<{
    shift: Shift;
    userToReplace: string | null;
  } | null>(null);

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

  const handleReplaceUser = (shift: Shift, userId: string) => {
    setSelectedShift(null);
    setReplaceState({ shift, userToReplace: userId });
  };

  const handleReplaceAll = (shift: Shift) => {
    setSelectedShift(null);
    setReplaceState({ shift, userToReplace: null });
  };

  const handleReplaceConfirm = async (newUsers: string[]) => {
    if (!replaceState) return;
    try {
      const data: Record<string, unknown> = { users: newUsers };
      // Propagate user replacements into splits
      const shifts = replaceState.shift.splits;
      if (shifts && shifts.length > 0 && replaceState.userToReplace) {
        const oldId = replaceState.userToReplace;
        const newId = newUsers[replaceState.shift.users.indexOf(oldId)];
        if (newId && newId !== oldId) {
          data.splits = shifts.map(s => ({
            ...s,
            firstHalfUser: s.firstHalfUser === oldId ? newId : s.firstHalfUser,
            secondHalfUser: s.secondHalfUser === oldId ? newId : s.secondHalfUser,
          }));
        }
      }
      await updateShift.mutateAsync({
        shiftId: replaceState.shift.id,
        data,
      });
      toast.success('המשמרת עודכנה בהצלחה');
      setReplaceState(null);
    } catch {
      toast.error('שגיאה בעדכון המשמרת');
    }
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
          onReplaceUser={(userId) => handleReplaceUser(selectedShift, userId)}
          onReplaceAll={() => handleReplaceAll(selectedShift)}
        />
      )}

      {/* Replace user dialog */}
      {replaceState && (
        <ReplaceUserDialog
          shift={replaceState.shift}
          userToReplace={replaceState.userToReplace}
          groupId={groupId!}
          userNames={userNames}
          onClose={() => setReplaceState(null)}
          onConfirm={handleReplaceConfirm}
        />
      )}
    </div>
  );
}
