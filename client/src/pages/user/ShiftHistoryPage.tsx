import { useState, useMemo } from 'react';
import { Archive, Calendar, MapPin } from 'lucide-react';
import { useAllShifts } from '@/hooks/user/useShifts';
import { useNonAdminGroups } from '@/hooks/user/useGroups';
import { Shift, ShiftStatus } from '@/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { SearchInput } from '@/components/ui/SearchInput';
import { ShiftDetailDialog } from '@/components/ui/ShiftDetailDialog';

export function UserShiftHistoryPage() {
  const { data: shifts = [], isLoading } = useAllShifts();
  const { data: groups = [] } = useNonAdminGroups();
  const [filterGroupId, setFilterGroupId] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogShift, setDialogShift] = useState<Shift | null>(null);

  const filtered = useMemo(() => {
    return shifts.filter((s) => {
      if (filterGroupId && s.groupId !== filterGroupId) return false;
      if (filterStatus && String(s.status) !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!s.displayName.toLowerCase().includes(q) &&
            !(s.location && s.location.toLowerCase().includes(q)) &&
            !(s.groupName && s.groupName.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [shifts, filterGroupId, filterStatus, searchQuery]);

  const totalHours = filtered
    .filter((s) => s.status === ShiftStatus.Finished)
    .reduce((acc, s) => {
      const h = (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / (1000 * 60 * 60);
      return acc + (isNaN(h) ? 0 : h);
    }, 0);

  return (
    <div className="page-bg" dir="rtl">
      <PageHeader
        icon={<Archive className="w-5 h-5 text-white" />}
        title="היסטוריית משמרות"
        subtitle="כל המשמרות שלך"
      />

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label='סה"כ משמרות' value={shifts.length} accent="blue" icon={<Calendar className="w-5 h-5" />} />
          <StatCard label="הושלמו" value={shifts.filter((s) => s.status === ShiftStatus.Finished).length} accent="green" />
          <StatCard label="שעות כולל" value={Math.floor(totalHours)} accent="amber" />
        </div>

        {/* Search + Filters */}
        <div className="space-y-3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="חיפוש לפי שם, מיקום או קבוצה..."
          />
          <div className="flex flex-wrap gap-3">
            <select
              value={filterGroupId}
              onChange={(e) => setFilterGroupId(e.target.value)}
              className="glass-input py-2 px-3 text-sm w-auto"
            >
              <option value="">כל הקבוצות</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.displayName}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="glass-input py-2 px-3 text-sm w-auto"
            >
              <option value="">כל הסטטוסים</option>
              <option value={String(ShiftStatus.Active)}>פעיל</option>
              <option value={String(ShiftStatus.Finished)}>הסתיים</option>
              <option value={String(ShiftStatus.Cancelled)}>בוטל</option>
            </select>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 py-16">לא נמצאו משמרות</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((shift) => (
              <GlassCard key={shift.id} hover className="p-4" onClick={() => setDialogShift(shift)}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-white">{shift.displayName}</h3>
                      <StatusBadge type="shift-status" value={shift.status} />
                    </div>
                    <p className="text-xs text-gray-500">{shift.groupName}</p>
                  </div>
                  <div className="text-left text-xs text-gray-400">
                    <div className="flex items-center gap-1 justify-end mb-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(shift.startDate).toLocaleDateString('he-IL')}</span>
                    </div>
                    {shift.location && (
                      <div className="flex items-center gap-1 justify-end">
                        <MapPin className="w-3 h-3" />
                        <span>{shift.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <ShiftDetailDialog
        shift={dialogShift}
        onClose={() => setDialogShift(null)}
      />
    </div>
  );
}
