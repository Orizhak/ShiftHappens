import { useState, useMemo } from 'react';
import { BarChart3, Users, Trophy, Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPoints } from '@/hooks/user/usePoints';
import { useNonAdminGroups } from '@/hooks/user/useGroups';
import { useGroupLeaderboard, useUserRank } from '@/hooks/user/usePoints';
import { useQueries } from '@tanstack/react-query';
import { userApi } from '@/api/user';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';

function LeaderboardView({ groupId, currentUserId }: { groupId: string; currentUserId: string }) {
  const { data: board = [], isLoading } = useGroupLeaderboard(groupId);
  const { data: rank } = useUserRank(groupId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />)}
      </div>
    );
  }

  const sorted = [...board].sort((a, b) => b.points - a.points);
  const maxPoints = sorted.length > 0 ? Math.max(...sorted.map(e => e.points)) : 1;
  const trophies = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-2">
      {rank !== undefined && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4 text-center">
          <p className="text-blue-300 text-sm">הדירוג שלך: <span className="font-bold text-blue-200">#{rank}</span> מתוך {sorted.length}</p>
        </div>
      )}
      {sorted.map((entry, idx) => {
        const isMe = entry.user.id === currentUserId;
        const barWidth = maxPoints > 0 ? (entry.points / maxPoints) * 100 : 0;
        return (
          <div
            key={entry.user.id}
            className={`relative flex items-center justify-between p-3 rounded-lg border transition-colors ${
              isMe ? 'bg-blue-500/10 border-blue-500/20' : 'bg-white/5 border-white/5 hover:bg-white/[0.08]'
            }`}
          >
            {/* Background bar */}
            <div
              className="absolute inset-y-0 right-0 rounded-lg opacity-10"
              style={{
                width: `${barWidth}%`,
                background: isMe ? 'rgb(59, 130, 246)' : 'rgb(156, 163, 175)',
              }}
            />
            <div className="flex items-center gap-3 relative z-10">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                idx === 0 ? 'bg-yellow-500/30 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.3)]' :
                idx === 1 ? 'bg-gray-400/20 text-gray-300 shadow-[0_0_10px_rgba(156,163,175,0.2)]' :
                idx === 2 ? 'bg-amber-600/30 text-amber-400 shadow-[0_0_10px_rgba(217,119,6,0.2)]' :
                'bg-white/10 text-gray-400'
              }`}>
                {idx < 3 ? trophies[idx] : idx + 1}
              </span>
              <div>
                <p className={`text-sm font-medium ${isMe ? 'text-blue-300' : 'text-gray-200'}`}>
                  {entry.user.name} {isMe && '(אתה)'}
                </p>
                <p className="text-xs text-gray-500">@{entry.user.username}</p>
              </div>
            </div>
            <span className="text-sm font-bold text-amber-400 relative z-10">{entry.points} נק'</span>
          </div>
        );
      })}
    </div>
  );
}

export function UserPointsPage() {
  const { user } = useAuth();
  const { data: points = [], isLoading: pointsLoading } = useUserPoints();
  const { data: groups = [] } = useNonAdminGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  const activeGroupId = selectedGroupId || groups[0]?.id || '';

  // Fetch ranks for all groups
  const rankQueries = useQueries({
    queries: groups.map((g) => ({
      queryKey: ['user', 'rank', g.id],
      queryFn: () => userApi.getRank(g.id).then((r) => r.rank),
      enabled: !!g.id,
    })),
  });

  // Compute KPIs
  const totalPoints = useMemo(() => points.reduce((sum, p) => sum + p.count, 0), [points]);
  const activeGroups = groups.length;

  const bestRank = useMemo(() => {
    const ranks = rankQueries
      .map((q) => q.data)
      .filter((r): r is number => typeof r === 'number' && r > 0);
    return ranks.length > 0 ? Math.min(...ranks) : null;
  }, [rankQueries]);

  return (
    <div className="page-bg" dir="rtl">
      <PageHeader
        icon={<BarChart3 className="w-5 h-5 text-white" />}
        title="נקודות ודירוג"
        subtitle="מעקב נקודות הגינות"
      />

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            accent="amber"
            label='סה"כ נקודות'
            value={pointsLoading ? '...' : totalPoints}
            subtitle="בכל הקבוצות"
            icon={<Trophy className="w-5 h-5" />}
          />
          <StatCard
            accent="blue"
            label="קבוצות פעילות"
            value={pointsLoading ? '...' : activeGroups}
            subtitle="קבוצות שאתה חבר בהן"
            icon={<Users className="w-5 h-5" />}
          />
          <StatCard
            accent="green"
            label="דירוג הטוב ביותר"
            value={pointsLoading ? '...' : (bestRank !== null ? `#${bestRank}` : '-')}
            subtitle="מבין כל הקבוצות"
            icon={<Award className="w-5 h-5" />}
          />
        </div>

        {/* My points per group */}
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {pointsLoading ? (
            <div className="h-28 bg-white/5 rounded-xl animate-pulse" />
          ) : points.length === 0 ? (
            <GlassCard className="p-5 text-center col-span-full">
              <p className="text-gray-500">אין נקודות עדיין</p>
            </GlassCard>
          ) : (
            points.map((p) => {
              const groupName = groups.find((g) => g.id === p.groupId)?.displayName ?? p.groupId;
              return (
                <GlassCard key={p.id} className="p-5 bg-gradient-to-br from-amber-500/15 to-amber-600/5 border-amber-500/20" glow="amber">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-400">{groupName}</p>
                    <Trophy className="w-5 h-5 text-amber-500/70" />
                  </div>
                  <p className="text-3xl font-bold text-amber-400">{p.count}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500">נקודות</p>
                    {p.lastDate && (
                      <p className="text-xs text-gray-500">
                        אחרון: {new Date(p.lastDate).toLocaleDateString('he-IL')}
                      </p>
                    )}
                  </div>
                </GlassCard>
              );
            })
          )}
        </div>

        {/* Leaderboard */}
        <GlassCard className="overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                דירוג קבוצה
              </h2>
              {groups.length > 1 && (
                <select
                  value={activeGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="glass-input py-1.5 px-3 text-sm w-auto"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.displayName}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="p-4">
            {activeGroupId && user ? (
              <LeaderboardView groupId={activeGroupId} currentUserId={user.id} />
            ) : (
              <p className="text-center text-gray-500 py-8">אין קבוצות זמינות</p>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
