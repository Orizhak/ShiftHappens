import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ClipboardList, Trash2, Sparkles } from 'lucide-react';
import { useGroupRequests, useDeleteGroupRequest } from '@/hooks/groupAdmin/useGroupRequests';
import { RequestType } from '@/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SearchInput } from '@/components/ui/SearchInput';
import { GlassDatePicker } from '@/components/ui/GlassDatePicker';
import { toast } from 'sonner';

function isRecent(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return diff < 7 * 24 * 60 * 60 * 1000;
}

function rangesOverlap(
  aStart: string, aEnd: string,
  bStart: string, bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function RequestManagementPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { data: requests = [], isLoading } = useGroupRequests(groupId!);
  const deleteMutation = useDeleteGroupRequest(groupId!);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (filterType !== 'all' && String(r.type) !== filterType) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!r.description.toLowerCase().includes(q) && !r.userName.toLowerCase().includes(q)) return false;
      }
      if (showNewOnly && !isRecent(r.createdAt)) return false;
      if (dateRangeStart && dateRangeEnd) {
        if (!rangesOverlap(r.startDate.slice(0, 10), r.endDate.slice(0, 10), dateRangeStart, dateRangeEnd)) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [requests, filterType, searchQuery, showNewOnly, dateRangeStart, dateRangeEnd]);

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    toast.success('הבקשה נמחקה');
  };

  return (
    <div className="page-bg" dir="rtl">
      <PageHeader
        icon={<ClipboardList className="w-5 h-5 text-white" />}
        title="ניהול בקשות"
        subtitle="צפייה בבקשות חברי הקבוצה"
      />

      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="space-y-3">
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="חיפוש לפי שם או תיאור..." />
          <div className="flex gap-2 flex-wrap items-end">
            {[
              { key: 'all', label: 'הכל' },
              { key: String(RequestType.Exclude), label: 'אי זמינות', color: 'red' },
              { key: String(RequestType.Prefer), label: 'העדפה', color: 'green' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilterType(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  filterType === tab.key
                    ? tab.key === String(RequestType.Prefer)
                      ? 'bg-green-500/80 text-white'
                      : tab.key === String(RequestType.Exclude)
                        ? 'bg-red-500/80 text-white'
                        : 'bg-blue-500/80 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button
              onClick={() => setShowNewOnly(!showNewOnly)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1 ${
                showNewOnly
                  ? 'bg-purple-500/80 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              חדשות
            </button>
            <div className="flex gap-2 items-end mr-auto">
              <GlassDatePicker
                value={dateRangeStart}
                onChange={setDateRangeStart}
                label="מתאריך"
                placeholder="התחלה"
              />
              <GlassDatePicker
                value={dateRangeEnd}
                onChange={setDateRangeEnd}
                label="עד תאריך"
                placeholder="סיום"
              />
              {(dateRangeStart || dateRangeEnd) && (
                <button
                  onClick={() => { setDateRangeStart(''); setDateRangeEnd(''); }}
                  className="px-3 py-2 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  נקה
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GlassCard className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{requests.length}</p>
            <p className="text-xs text-gray-400">סה"כ בקשות</p>
          </GlassCard>
          <GlassCard className="p-4 text-center" glow="red">
            <p className="text-2xl font-bold text-red-400">
              {requests.filter(r => r.type === RequestType.Exclude).length}
            </p>
            <p className="text-xs text-gray-400">אי זמינות</p>
          </GlassCard>
          <GlassCard className="p-4 text-center" glow="green">
            <p className="text-2xl font-bold text-green-400">
              {requests.filter(r => r.type === RequestType.Prefer).length}
            </p>
            <p className="text-xs text-gray-400">העדפות</p>
          </GlassCard>
        </div>

        {/* Requests list */}
        <GlassCard className="overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">בקשות ({filtered.length})</h2>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">טוען...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">אין בקשות</div>
          ) : (
            <ul className="divide-y divide-white/5">
              {filtered.map(req => (
                <li key={req.id} className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white">{req.userName}</span>
                        <StatusBadge type="request-type" value={req.type} />
                        {isRecent(req.createdAt) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            חדש
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-300">{req.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(req.startDate).toLocaleDateString('he-IL')} -{' '}
                        {new Date(req.endDate).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(req.id)}
                      disabled={deleteMutation.isPending}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
