import { useNavigate } from 'react-router-dom';
import { Calendar, Bell, Plus, Users, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUpcomingShifts } from '@/hooks/user/useShifts';
import { useUserPoints, useGroupLeaderboard, useUserRank } from '@/hooks/user/usePoints';
import { useNonAdminGroups } from '@/hooks/user/useGroups';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';

function LoadingCard() {
  return <div className="h-32 bg-white/5 rounded-xl animate-pulse" />;
}

export function UserDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: upcomingShifts = [], isLoading: shiftsLoading } = useUpcomingShifts();
  const { data: points = [], isLoading: pointsLoading } = useUserPoints();
  const { data: groups = [], isLoading: groupsLoading } = useNonAdminGroups();

  const firstGroup = groups[0];
  const { data: leaderboard = [] } = useGroupLeaderboard(firstGroup?.id ?? '');
  const { data: rank } = useUserRank(firstGroup?.id ?? '');

  const isLoading = shiftsLoading || pointsLoading || groupsLoading;
  const nextShift = upcomingShifts[0];

  return (
    <div className="min-h-screen page-bg" dir="rtl">
      {/* Header */}
      <PageHeader
        icon={<BarChart3 className="w-5 h-5 text-white" />}
        title="לוח בקרה"
        subtitle={`ברוך הבא, ${user?.name}!`}
        actions={
          <div className="flex gap-2">
            <GlassButton
              variant="secondary"
              icon={<Bell className="w-4 h-4" />}
              onClick={() => alert('אין התראות חדשות')}
            >
              <span className="hidden sm:inline">התראות</span>
            </GlassButton>
            <GlassButton
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => navigate('/user/requests')}
            >
              <span className="hidden sm:inline">בקשת חופש</span>
            </GlassButton>
          </div>
        }
      />

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* KPI Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => <LoadingCard key={i} />)}
          </div>
        ) : (
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {/* Upcoming shifts */}
            <StatCard
              accent="blue"
              label="משמרות קרובות"
              value={upcomingShifts.length}
              subtitle={
                nextShift
                  ? `המשמרת הבאה ב-${new Date(nextShift.startDate).toLocaleDateString('he-IL')}`
                  : 'אין משמרות קרובות'
              }
              icon={<Calendar className="w-5 h-5" />}
            />

            {/* Rank */}
            {firstGroup && rank !== undefined && (
              <StatCard
                accent="green"
                label={`דירוג ב${firstGroup.displayName}`}
                value={`#${rank}`}
                subtitle={`מתוך ${leaderboard.length} חברי קבוצה`}
                icon={<Users className="w-5 h-5" />}
              />
            )}

            {/* Points */}
            {points[0] && (
              <StatCard
                accent="amber"
                label="נקודות"
                value={points[0].count}
                subtitle={groups.find((g) => g.id === points[0].groupId)?.displayName ?? ''}
                icon={<BarChart3 className="w-5 h-5" />}
              />
            )}
          </div>
        )}

        {/* Upcoming shifts list + points overview */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upcoming shifts */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              משמרות קרובות
            </h2>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <LoadingCard key={i} />)}</div>
            ) : upcomingShifts.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">אין משמרות קרובות</p>
            ) : (
              <div className="space-y-3">
                {upcomingShifts.slice(0, 5).map((shift) => (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{shift.displayName}</p>
                      <p className="text-xs text-gray-400">{shift.groupName}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-gray-300">
                        {new Date(shift.startDate).toLocaleDateString('he-IL')}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(shift.startDate).toLocaleTimeString('he-IL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Points overview */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              נקודות לפי קבוצה
            </h2>
            {pointsLoading ? (
              <div className="space-y-3">{[1, 2].map((i) => <LoadingCard key={i} />)}</div>
            ) : points.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">אין נקודות עדיין</p>
            ) : (
              <div className="space-y-3">
                {points.map((p) => {
                  const groupName = groups.find((g) => g.id === p.groupId)?.displayName ?? p.groupId;
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                      <p className="text-sm text-gray-300">{groupName}</p>
                      <span className="text-sm font-bold text-amber-400">{p.count} נק'</span>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
