import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Users, Shield, ShieldOff, UserMinus, Tags, UserPlus,
  X, ChevronLeft, Calendar, BarChart3, Clock, Award,
} from 'lucide-react';
import {
  useGroupUsers,
  useUpdateUserRole,
  useUpdateUserCategories,
  useGroupCategories,
  useGroupLeaderboard,
  useAvailableUsers,
  useAddUsersToGroup,
} from '@/hooks/groupAdmin/useGroupUsers';
import { useGroupShifts } from '@/hooks/groupAdmin/useGroupShifts';
import { SessionUser } from '@/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatCard } from '@/components/ui/StatCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { getRank } from '@/utils/rank';
import { toast } from 'sonner';

// ─── User Detail Sheet ───────────────────────────────────────────────────────
function UserDetailSheet({
  user,
  groupId,
  onClose,
}: {
  user: SessionUser;
  groupId: string;
  onClose: () => void;
}) {
  const { data: categories = [] } = useGroupCategories(groupId);
  const { data: shifts = [] } = useGroupShifts(groupId);
  const { data: board = [] } = useGroupLeaderboard(groupId);

  const rank = getRank(user.recruitmentDate, user.userCategories);
  const isAdmin = user.groups?.some((g) => g.groupId === groupId && g.isAdmin);

  const userShifts = useMemo(
    () => shifts
      .filter(s => s.users?.includes(user.id))
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .slice(0, 10),
    [shifts, user.id]
  );

  const userPoints = board.find(e => e.user.id === user.id)?.points ?? 0;
  const totalShifts = shifts.filter(s => s.users?.includes(user.id)).length;
  const avgPoints = totalShifts > 0 ? Math.round(userPoints / totalShifts) : 0;

  const getCatName = (id: string) => categories.find(c => c.id === id)?.displayName ?? id;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative mr-auto w-full max-w-md h-full bg-gray-900/95 border-r border-white/10 overflow-y-auto animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideInRight 0.25s ease' }}
      >
        <div className="sticky top-0 z-10 bg-gray-900/90 backdrop-blur-md border-b border-white/10 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">פרטי משתמש</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Basic info */}
          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-lg font-bold text-blue-300">
                {user.name?.charAt(0) || '?'}
              </div>
              <div>
                <h3 className="font-semibold text-white">{user.name}</h3>
                <p className="text-xs text-gray-400">@{user.username}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">דרגה</span>
                <span className="text-white">
                  {rank.emoji && `${rank.emoji} `}{rank.rank}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">תפקיד</span>
                <span className={isAdmin ? 'text-orange-300' : 'text-gray-300'}>
                  {isAdmin ? 'מנהל' : 'חבר'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">מין</span>
                <span className="text-gray-300">{user.gender === 1 ? 'זכר' : 'נקבה'}</span>
              </div>
              {user.recruitmentDate && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">תאריך גיוס</span>
                  <span className="text-gray-300">
                    {new Date(user.recruitmentDate).toLocaleDateString('he-IL')}
                  </span>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Categories */}
          <GlassCard className="p-4">
            <h4 className="text-sm font-medium text-gray-400 mb-2">קטגוריות</h4>
            {user.userCategories?.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {user.userCategories.map(catId => (
                  <span key={catId} className="px-2.5 py-1 rounded-full text-xs bg-blue-500/15 text-blue-300 border border-blue-500/25">
                    {getCatName(catId)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">אין קטגוריות</p>
            )}
          </GlassCard>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <GlassCard className="p-3 text-center">
              <p className="text-lg font-bold text-blue-400">{totalShifts}</p>
              <p className="text-[10px] text-gray-500">משמרות</p>
            </GlassCard>
            <GlassCard className="p-3 text-center">
              <p className="text-lg font-bold text-amber-400">{userPoints}</p>
              <p className="text-[10px] text-gray-500">נקודות</p>
            </GlassCard>
            <GlassCard className="p-3 text-center">
              <p className="text-lg font-bold text-green-400">{avgPoints}</p>
              <p className="text-[10px] text-gray-500">ממוצע/משמרת</p>
            </GlassCard>
          </div>

          {/* Shift history */}
          <GlassCard className="p-4">
            <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              משמרות אחרונות
            </h4>
            {userShifts.length === 0 ? (
              <p className="text-xs text-gray-500">אין משמרות</p>
            ) : (
              <div className="space-y-2">
                {userShifts.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-xs font-medium text-white">{s.displayName}</p>
                      <p className="text-[10px] text-gray-500">
                        {new Date(s.startDate).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      s.status === 1 ? 'bg-blue-500/15 text-blue-400' :
                      s.status === 2 ? 'bg-green-500/15 text-green-400' :
                      'bg-red-500/15 text-red-400'
                    }`}>
                      {s.status === 1 ? 'פעיל' : s.status === 2 ? 'הסתיים' : 'בוטל'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Add Users Dialog ─────────────────────────────────────────────────────────
function AddUsersDialog({
  groupId,
  onClose,
}: {
  groupId: string;
  onClose: () => void;
}) {
  const { data: availableUsers = [], isLoading } = useAvailableUsers(groupId, true);
  const { data: categories = [] } = useGroupCategories(groupId);
  const addUsers = useAddUsersToGroup(groupId);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return availableUsers.filter(u => {
      if (search) {
        const q = search.toLowerCase();
        if (!u.name?.toLowerCase().includes(q) && !u.username?.toLowerCase().includes(q)) return false;
      }
      if (categoryFilter && !u.userCategories?.includes(categoryFilter)) return false;
      return true;
    });
  }, [availableUsers, search, categoryFilter]);

  const toggleUser = (userId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selected.size === 0) return;
    await addUsers.mutateAsync(Array.from(selected));
    toast.success(`${selected.size} משתמשים נוספו`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg glass-card p-6 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">הוסף חברים לקבוצה</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          <SearchInput value={search} onChange={setSearch} placeholder="חיפוש לפי שם..." />
          {categories.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setCategoryFilter('')}
                className={`px-2 py-1 rounded-full text-xs transition-colors ${
                  !categoryFilter ? 'bg-blue-500/80 text-white' : 'bg-white/5 text-gray-400 border border-white/10'
                }`}
              >
                הכל
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id === categoryFilter ? '' : cat.id)}
                  className={`px-2 py-1 rounded-full text-xs transition-colors ${
                    categoryFilter === cat.id ? 'bg-blue-500/80 text-white' : 'bg-white/5 text-gray-400 border border-white/10'
                  }`}
                >
                  {cat.displayName}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 mb-4 min-h-0">
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">טוען...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-gray-500 py-8">אין משתמשים זמינים</div>
          ) : (
            filtered.map(user => {
              const isSelected = selected.has(user.id);
              return (
                <div
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isSelected ? 'bg-blue-500/20 text-blue-300' : 'bg-white/10 text-gray-400'
                    }`}>
                      {user.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{user.name}</p>
                      <p className="text-xs text-gray-500">@{user.username}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex gap-3">
          <GlassButton
            onClick={handleAdd}
            disabled={selected.size === 0 || addUsers.isPending}
            className="flex-1"
          >
            {addUsers.isPending ? 'מוסיף...' : `הוסף ${selected.size > 0 ? `(${selected.size})` : ''}`}
          </GlassButton>
          <GlassButton variant="secondary" onClick={onClose}>ביטול</GlassButton>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function UsersManagementPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'points' | 'rank'>('name');
  const [editingCategoriesFor, setEditingCategoriesFor] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<SessionUser | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: users = [], isLoading } = useGroupUsers(groupId!);
  const { data: categories = [] } = useGroupCategories(groupId!);
  const { data: board = [] } = useGroupLeaderboard(groupId!);
  const updateRole = useUpdateUserRole(groupId!);
  const updateCategories = useUpdateUserCategories(groupId!);

  const pointsMap = useMemo(() => {
    const map = new Map<string, number>();
    board.forEach(e => map.set(e.user.id, e.points));
    return map;
  }, [board]);

  const kevaCount = useMemo(() => {
    return users.filter(u => {
      const r = getRank((u as any).recruitmentDate, u.userCategories);
      return r.isKeva;
    }).length;
  }, [users]);

  const avgPoints = useMemo(() => {
    if (users.length === 0) return 0;
    const total = users.reduce((sum, u) => sum + (pointsMap.get(u.id) ?? 0), 0);
    return Math.round(total / users.length);
  }, [users, pointsMap]);

  const filtered = useMemo(() => {
    let result = users.filter((u) => {
      if (search) {
        const q = search.toLowerCase();
        if (!u.name?.toLowerCase().includes(q) && !u.username?.toLowerCase().includes(q)) return false;
      }
      if (categoryFilter && !u.userCategories?.includes(categoryFilter)) return false;
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'points') {
        return (pointsMap.get(b.id) ?? 0) - (pointsMap.get(a.id) ?? 0);
      }
      if (sortBy === 'rank') {
        const ra = getRank((a as any).recruitmentDate, a.userCategories);
        const rb = getRank((b as any).recruitmentDate, b.userCategories);
        return ra.rank.localeCompare(rb.rank, 'he');
      }
      return (a.name ?? '').localeCompare(b.name ?? '', 'he');
    });

    return result;
  }, [users, search, categoryFilter, sortBy, pointsMap]);

  const isAdminInGroup = (user: typeof users[0]) =>
    (user as any).groups?.some((g: any) => g.groupId === groupId && g.isAdmin);

  const openCategoryEditor = (userId: string, currentCategories: string[]) => {
    setEditingCategoriesFor(userId);
    setSelectedCategories(currentCategories);
  };

  const saveCategoryEdit = async () => {
    if (!editingCategoriesFor) return;
    await updateCategories.mutateAsync({ userId: editingCategoriesFor, categories: selectedCategories });
    setEditingCategoriesFor(null);
  };

  const getCatName = (id: string) => categories.find(c => c.id === id)?.displayName ?? id;

  return (
    <div className="page-bg" dir="rtl">
      <PageHeader
        icon={<Users className="w-5 h-5 text-white" />}
        title="ניהול משתמשים"
        subtitle={`${users.length} משתמשים בקבוצה`}
        actions={
          <GlassButton
            variant="primary"
            icon={<UserPlus className="w-4 h-4" />}
            onClick={() => setShowAddDialog(true)}
          >
            הוסף חברים
          </GlassButton>
        }
      />

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label='סה"כ חברים'
            value={users.length}
            icon={<Users className="w-5 h-5" />}
            accent="blue"
          />
          <StatCard
            label="חיילי קבע"
            value={kevaCount}
            icon={<Award className="w-5 h-5" />}
            accent="amber"
          />
          <StatCard
            label="ממוצע נקודות"
            value={avgPoints}
            icon={<BarChart3 className="w-5 h-5" />}
            accent="green"
            subtitle="נק' לחבר"
          />
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <SearchInput value={search} onChange={setSearch} placeholder="חיפוש משתמש..." />
          <div className="flex gap-2 flex-wrap items-center">
            {/* Category filters */}
            <button
              onClick={() => setCategoryFilter('')}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                !categoryFilter ? 'bg-blue-500/80 text-white' : 'bg-white/5 text-gray-400 border border-white/10'
              }`}
            >
              הכל
            </button>
            {categories.slice(0, 5).map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id === categoryFilter ? '' : cat.id)}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                  categoryFilter === cat.id ? 'bg-blue-500/80 text-white' : 'bg-white/5 text-gray-400 border border-white/10'
                }`}
              >
                {cat.displayName}
              </button>
            ))}

            <div className="mr-auto" />

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="glass-input text-xs py-1 px-2 w-auto"
            >
              <option value="name">שם</option>
              <option value="points">נקודות</option>
              <option value="rank">דרגה</option>
            </select>
          </div>
        </div>

        {/* Users list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 py-16">לא נמצאו משתמשים</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((user) => {
              const isAdmin = isAdminInGroup(user);
              const rank = getRank((user as any).recruitmentDate, user.userCategories);
              const pts = pointsMap.get(user.id) ?? 0;

              return (
                <GlassCard
                  key={user.id}
                  className="p-4 cursor-pointer"
                  hover
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center text-sm font-bold text-blue-300">
                        {user.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white">{user.name}</p>
                          {/* Rank badge */}
                          {rank.rank && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                              rank.isKeva
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : 'bg-white/5 text-gray-400 border-white/15'
                            }`}>
                              {rank.emoji && `${rank.emoji} `}{rank.rank}
                            </span>
                          )}
                          {isAdmin && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30">
                              מנהל
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-500">@{user.username}</p>
                          {user.userCategories?.length > 0 && (
                            <div className="flex gap-1">
                              {user.userCategories.slice(0, 2).map(catId => (
                                <span key={catId} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                                  {getCatName(catId)}
                                </span>
                              ))}
                              {user.userCategories.length > 2 && (
                                <span className="text-[10px] text-gray-500">+{user.userCategories.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3" onClick={(e) => e.stopPropagation()}>
                      <span className="text-sm font-bold text-amber-400">{pts} נק'</span>
                      <div className="hidden sm:flex items-center gap-1">
                        <button
                          onClick={() =>
                            updateRole.mutate({
                              userId: user.id,
                              action: isAdmin ? 'removeAdmin' : 'makeAdmin',
                            })
                          }
                          className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-orange-400 transition-colors"
                          title={isAdmin ? 'הסר מנהל' : 'הפוך למנהל'}
                        >
                          {isAdmin ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openCategoryEditor(user.id, user.userCategories ?? [])}
                          className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-colors"
                          title="עריכת קטגוריות"
                        >
                          <Tags className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            updateRole.mutate({ userId: user.id, action: 'removeFromGroup' })
                          }
                          className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                          title="הסר מהקבוצה"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Mobile: show chevron to indicate clickability */}
                      <ChevronLeft className="w-4 h-4 text-gray-500 sm:hidden" />
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Category editor modal */}
      {editingCategoriesFor && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setEditingCategoriesFor(null)}>
          <div className="glass-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">עריכת קטגוריות</h2>
            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
              {categories.map((cat) => (
                <label key={cat.id} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCategories((prev) => [...prev, cat.id]);
                      } else {
                        setSelectedCategories((prev) => prev.filter((id) => id !== cat.id));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-300">{cat.displayName}</span>
                </label>
              ))}
              {categories.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">אין קטגוריות מוגדרות</p>
              )}
            </div>
            <div className="flex gap-3">
              <GlassButton
                onClick={saveCategoryEdit}
                disabled={updateCategories.isPending}
                className="flex-1"
              >
                שמור
              </GlassButton>
              <GlassButton variant="secondary" onClick={() => setEditingCategoriesFor(null)} className="flex-1">
                ביטול
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      {/* User detail sheet */}
      {selectedUser && (
        <UserDetailSheet
          user={selectedUser}
          groupId={groupId!}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {/* Add users dialog */}
      {showAddDialog && (
        <AddUsersDialog
          groupId={groupId!}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </div>
  );
}
