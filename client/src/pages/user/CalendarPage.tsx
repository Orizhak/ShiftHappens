import { useState, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Calendar, List, MapPin, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAllShifts } from '@/hooks/user/useShifts';
import { useRequests, useDeleteRequest } from '@/hooks/user/useRequests';
import { useNonAdminGroups } from '@/hooks/user/useGroups';
import { Shift, Request, RequestType, ShiftStatus } from '@/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { ShiftDetailDialog } from '@/components/ui/ShiftDetailDialog';
import { GlassButton } from '@/components/ui/GlassButton';

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];
const HEBREW_DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

const GROUP_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-indigo-500',
  'bg-teal-500', 'bg-cyan-500', 'bg-sky-500',
];
const GROUP_DOT_COLORS = [
  'bg-blue-400', 'bg-purple-400', 'bg-indigo-400',
  'bg-teal-400', 'bg-cyan-400', 'bg-sky-400',
];

function getGroupColor(groupId: string, groupIds: string[]) {
  const idx = groupIds.indexOf(groupId);
  return GROUP_COLORS[idx % GROUP_COLORS.length] ?? 'bg-blue-500';
}

function getGroupDotColor(groupId: string, groupIds: string[]) {
  const idx = groupIds.indexOf(groupId);
  return GROUP_DOT_COLORS[idx % GROUP_DOT_COLORS.length] ?? 'bg-blue-400';
}

function formatTimeRange(start: Date, end: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(start.getHours())}:${pad(start.getMinutes())} - ${pad(end.getHours())}:${pad(end.getMinutes())}`;
}

function getDaysInMonth(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function getShiftsForDay(
  day: number, year: number, month: number,
  shifts: Shift[], userId: string, groupId: string
): Shift[] {
  const d = new Date(year, month, day).toDateString();
  return shifts.filter(
    (s) =>
      (groupId === 'all' || s.groupId === groupId) &&
      s.users?.includes(userId) &&
      s.status !== ShiftStatus.Cancelled &&
      new Date(s.startDate).toDateString() === d
  );
}

function getRequestsForDay(day: number, year: number, month: number, requests: Request[]): Request[] {
  const pad = (n: number) => String(n).padStart(2, '0');
  const dStr = `${year}-${pad(month + 1)}-${pad(day)}`;
  return requests.filter((r) => {
    const s = new Date(r.startDate);
    const e = new Date(r.endDate);
    const startStr = `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`;
    const endStr = `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(e.getDate())}`;
    return dStr >= startStr && dStr <= endStr;
  });
}

export function UserCalendarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [dialogShift, setDialogShift] = useState<Shift | null>(null);
  const [dialogRequest, setDialogRequest] = useState<Request | null>(null);

  // Drag-to-select state
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMoved, setDragMoved] = useState(false);

  const { data: shifts = [] } = useAllShifts();
  const { data: requests = [] } = useRequests();
  const { data: groups = [] } = useNonAdminGroups();
  const deleteMutation = useDeleteRequest();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayStr = new Date().toDateString();

  const days = getDaysInMonth(year, month);
  const uniqueGroupIds = Array.from(new Set(shifts.map((s) => s.groupId)));

  const getDragRange = useCallback(() => {
    if (dragStart === null) return { min: 0, max: 0 };
    const end = dragEnd ?? dragStart;
    return { min: Math.min(dragStart, end), max: Math.max(dragStart, end) };
  }, [dragStart, dragEnd]);

  const finalizeDrag = useCallback(() => {
    if (dragStart === null) return;
    const { min, max } = getDragRange();
    const pad = (n: number) => String(n).padStart(2, '0');
    const startDate = `${year}-${pad(month + 1)}-${pad(min)}`;
    const endDate = `${year}-${pad(month + 1)}-${pad(max)}`;
    const moved = dragMoved;
    setDragStart(null);
    setDragEnd(null);
    setIsDragging(false);
    setDragMoved(false);
    if (moved) {
      navigate(`/user/requests?startDate=${startDate}&endDate=${endDate}`);
    }
  }, [dragStart, getDragRange, dragMoved, year, month, navigate]);

  // Cancel drag if mouse released outside calendar
  const handleGlobalMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      setDragMoved(false);
    }
  }, [isDragging]);

  const navigateMonth = (dir: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1));
      return d;
    });
  };

  // Filtered list for list view
  const filteredListShifts = useMemo(() => {
    let result = selectedGroupId === 'all' ? shifts : shifts.filter((s) => s.groupId === selectedGroupId);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) => s.displayName.toLowerCase().includes(q) || (s.location && s.location.toLowerCase().includes(q))
      );
    }
    return result;
  }, [shifts, selectedGroupId, searchQuery]);

  const filteredListRequests = useMemo(() => {
    if (!user) return [];
    let result = requests.filter((r) => r.userId === user.id);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) => r.description?.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [requests, user, searchQuery]);

  const handleDeleteRequest = (id: string) => {
    deleteMutation.mutate(id);
    setDialogRequest(null);
  };

  return (
    <div className="page-bg" dir="rtl">
      <PageHeader
        icon={<Calendar className="w-5 h-5 text-white" />}
        title="לוח שנה"
        subtitle="צפה ונהל את המשמרות שלך"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors ${viewMode === 'calendar' ? 'bg-blue-500/80 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <Calendar className="w-4 h-4" />
                לוח שנה
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors ${viewMode === 'list' ? 'bg-blue-500/80 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <List className="w-4 h-4" />
                רשימה
              </button>
            </div>
            {/* Group filter */}
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="glass-input py-1.5 px-3 text-sm w-auto"
            >
              <option value="all">כל הקבוצות</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.displayName}</option>)}
            </select>
            <GlassButton
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => navigate('/user/requests')}
              className="text-sm py-1.5"
            >
              בקשת חופש
            </GlassButton>
          </div>
        }
      />

      <div className="container mx-auto px-4 py-8 space-y-6">
        {viewMode === 'calendar' ? (
          <>
            {/* Calendar card */}
            <GlassCard className="overflow-hidden">
              {/* Month navigation — RTL fixed: right arrow = prev, left arrow = next */}
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
                  const dayRequests = getRequestsForDay(day, year, month, requests);
                  const excludeRequests = dayRequests.filter((r) => r.type === RequestType.Exclude);
                  const preferRequests = dayRequests.filter((r) => r.type === RequestType.Prefer);
                  const userRequests = dayRequests.filter((r) => user && r.userId === user.id);
                  const isExcluded = excludeRequests.length > 0;
                  const isPreferred = preferRequests.length > 0;
                  const dayShifts = getShiftsForDay(day, year, month, shifts, user?.id ?? '', selectedGroupId);

                  // Status-based cell colors
                  let cellClass = 'bg-white/[0.03] border-white/5 hover:bg-white/[0.08]';
                  let ringClass = isToday ? 'ring-2 ring-blue-500/60' : '';

                  // Check for completed/active shifts
                  const hasCompleted = dayShifts.some(s => s.status === ShiftStatus.Finished);
                  const hasActive = dayShifts.some(s => s.status === ShiftStatus.Active);

                  if (isExcluded) {
                    cellClass = 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15';
                    ringClass = isToday ? 'ring-2 ring-red-500/60' : '';
                  } else if (isPreferred) {
                    cellClass = 'bg-green-500/10 border-green-500/20 hover:bg-green-500/15';
                    ringClass = isToday ? 'ring-2 ring-green-500/60' : '';
                  } else if (hasCompleted) {
                    cellClass = 'bg-green-500/10 border-green-500/20 hover:bg-green-500/15';
                    ringClass = isToday ? 'ring-2 ring-green-500/60' : '';
                  } else if (hasActive) {
                    cellClass = 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15';
                    ringClass = isToday ? 'ring-2 ring-blue-500/60' : '';
                  }

                  const dayNumColor = isToday ? 'text-blue-400 font-bold' : 'text-gray-300';

                  // Drag-to-select highlight
                  const { min: dragMin, max: dragMax } = getDragRange();
                  const isInDragRange = isDragging && day >= dragMin && day <= dragMax;
                  const dragClass = isInDragRange ? 'bg-blue-500/20 border-blue-500/30 ring-1 ring-blue-500/20' : '';

                  return (
                    <div
                      key={`day-${day}-${i}`}
                      className={`relative min-h-[60px] sm:min-h-[90px] p-1 sm:p-2 border rounded-lg transition-colors cursor-pointer select-none ${dragClass || cellClass} ${ringClass}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setDragStart(day);
                        setDragEnd(null);
                        setIsDragging(true);
                        setDragMoved(false);
                      }}
                      onMouseEnter={() => {
                        if (isDragging && dragStart !== null && day !== dragStart) {
                          setDragMoved(true);
                          setDragEnd(day);
                        }
                      }}
                      onMouseUp={() => {
                        if (isDragging) {
                          if (dragMoved) {
                            finalizeDrag();
                          } else {
                            // Single click — open dialog
                            setIsDragging(false);
                            setDragStart(null);
                            setDragEnd(null);
                            setDragMoved(false);
                            if (dayShifts.length > 0) {
                              setDialogShift(dayShifts[0]);
                            } else if (userRequests.length > 0) {
                              setDialogRequest(userRequests[0]);
                            } else {
                              // Empty day click — navigate to create request for that day
                              const pad = (n: number) => String(n).padStart(2, '0');
                              const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
                              navigate(`/user/requests?startDate=${dateStr}&endDate=${dateStr}`);
                            }
                          }
                        }
                      }}
                      onTouchStart={() => {
                        setDragStart(day);
                        setDragEnd(null);
                        setIsDragging(true);
                        setDragMoved(false);
                      }}
                      onTouchEnd={() => {
                        if (isDragging && dragMoved) {
                          finalizeDrag();
                        } else if (isDragging) {
                          setIsDragging(false);
                          setDragStart(null);
                          setDragEnd(null);
                          setDragMoved(false);
                          if (dayShifts.length > 0) {
                            setDialogShift(dayShifts[0]);
                          } else if (userRequests.length > 0) {
                            setDialogRequest(userRequests[0]);
                          }
                        }
                      }}
                    >
                      {/* Day number */}
                      <div className={`text-xs sm:text-sm mb-1 ${dayNumColor}`}>
                        {day}
                      </div>

                      {/* Exclude requests */}
                      {isExcluded && (
                        <div className="space-y-0.5 overflow-hidden">
                          {excludeRequests.slice(0, 1).map((r) => (
                            <div key={r.id} className="text-xs p-1 rounded bg-red-500/20 text-red-300 border border-red-500/30 overflow-hidden">
                              <div className="font-medium truncate">הסתייגות</div>
                              {r.description && (
                                <div className="text-[10px] opacity-80 truncate hidden sm:block">{r.description}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Prefer requests */}
                      {!isExcluded && isPreferred && (
                        <div className="space-y-0.5 overflow-hidden">
                          {preferRequests.slice(0, 1).map((r) => (
                            <div key={r.id} className="text-xs p-1 rounded bg-green-500/20 text-green-300 border border-green-500/30 overflow-hidden">
                              <div className="font-medium truncate">העדפה</div>
                              {r.description && (
                                <div className="text-[10px] opacity-80 truncate hidden sm:block">{r.description}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Shifts */}
                      {!isExcluded && dayShifts.length > 0 && (
                        <div className="space-y-0.5 overflow-hidden">
                          {dayShifts.slice(0, 2).map((s) => {
                            const start = new Date(s.startDate);
                            const end = new Date(s.endDate);
                            const dotColor = getGroupDotColor(s.groupId, uniqueGroupIds);
                            const isCompleted = s.status === ShiftStatus.Finished;
                            const pillBg = isCompleted ? 'bg-green-500/15 border-green-500/25 text-green-300' : 'bg-blue-500/15 border-blue-500/25 text-blue-300';
                            return (
                              <div key={s.id} className={`text-xs p-1 rounded border ${pillBg}`}>
                                <div className="font-medium flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                                  <span className="truncate">{s.displayName}</span>
                                </div>
                                <div className="text-[10px] opacity-70 hidden sm:block">{formatTimeRange(start, end)}</div>
                              </div>
                            );
                          })}
                          {dayShifts.length > 2 && (
                            <div className="text-[10px] text-gray-500 pr-1">+{dayShifts.length - 2} עוד</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            {/* Drag hint */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
              <p className="text-blue-300 text-sm">גרור על ימים ביומן כדי ליצור בקשת חופש</p>
            </div>

            {/* Legend */}
            <GlassCard className="p-5">
              <h3 className="text-lg font-bold text-white mb-4">מקרא</h3>
              <div className="flex flex-wrap gap-6">
                {groups.length > 0 && (
                  <div className="flex-1 min-w-[180px]">
                    <h4 className="text-sm font-semibold text-gray-400 mb-3">קבוצות</h4>
                    <div className="flex flex-wrap gap-2">
                      {groups.map((g) => (
                        <div key={g.id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                          <div className={`w-3 h-3 rounded-full ${getGroupColor(g.id, uniqueGroupIds)}`} />
                          <span className="text-sm font-medium text-gray-300">{g.displayName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex-1 min-w-[180px]">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">סטטוס</h4>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge type="shift-status" value={ShiftStatus.Active} />
                    <StatusBadge type="shift-status" value={ShiftStatus.Finished} />
                    <StatusBadge type="shift-status" value={ShiftStatus.Cancelled} />
                  </div>
                </div>
                <div className="flex-1 min-w-[180px]">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">בקשות</h4>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge type="request-type" value={RequestType.Exclude} />
                    <StatusBadge type="request-type" value={RequestType.Prefer} />
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5">
                      <div className="w-2 h-2 rounded-full ring-2 ring-blue-500/60" />
                      <span className="text-xs text-gray-300">היום</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </>
        ) : (
          /* List view */
          <div className="space-y-4">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="חיפוש לפי שם משמרת או מיקום..."
            />

            {filteredListShifts.length === 0 && filteredListRequests.length === 0 ? (
              <p className="text-center text-gray-500 py-16">לא נמצאו משמרות או בקשות</p>
            ) : (
              <div className="space-y-3">
                {/* Shifts */}
                {filteredListShifts.map((shift) => (
                  <GlassCard
                    key={shift.id}
                    hover
                    className="p-4"
                    onClick={() => setDialogShift(shift)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${getGroupDotColor(shift.groupId, uniqueGroupIds)}`} />
                          <h3 className="font-medium text-white">{shift.displayName}</h3>
                          <StatusBadge type="shift-status" value={shift.status} />
                        </div>
                        <p className="text-xs text-gray-500">{shift.groupName}</p>
                        {shift.location && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />
                            {shift.location}
                          </div>
                        )}
                      </div>
                      <div className="text-left text-xs text-gray-400">
                        <p>{new Date(shift.startDate).toLocaleDateString('he-IL')}</p>
                        <p>{formatTimeRange(new Date(shift.startDate), new Date(shift.endDate))}</p>
                      </div>
                    </div>
                  </GlassCard>
                ))}

                {/* Requests */}
                {filteredListRequests.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold text-gray-400 mt-4">בקשות</h3>
                    {filteredListRequests.map((req) => (
                      <GlassCard
                        key={req.id}
                        hover
                        className="p-4"
                        onClick={() => setDialogRequest(req)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-white">
                                {req.type === RequestType.Exclude ? 'הסתייגות' : 'העדפה'}
                              </h3>
                              <StatusBadge type="request-type" value={req.type} />
                            </div>
                            {req.description && (
                              <p className="text-xs text-gray-500">{req.description}</p>
                            )}
                          </div>
                          <div className="text-left text-xs text-gray-400">
                            <p>{new Date(req.startDate).toLocaleDateString('he-IL')}</p>
                            <p>עד {new Date(req.endDate).toLocaleDateString('he-IL')}</p>
                          </div>
                        </div>
                      </GlassCard>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Shift Detail Dialog */}
      <ShiftDetailDialog
        shift={dialogShift}
        onClose={() => setDialogShift(null)}
      />

      {/* Request Detail Dialog */}
      <ShiftDetailDialog
        request={dialogRequest}
        onClose={() => setDialogRequest(null)}
        onDeleteRequest={handleDeleteRequest}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
