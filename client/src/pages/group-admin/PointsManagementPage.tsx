import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart3, Plus, Minus, Trophy, Crown, TrendingUp } from 'lucide-react';
import { useGroupLeaderboard } from '@/hooks/groupAdmin/useGroupUsers';
import { useAdjustPoints } from '@/hooks/groupAdmin/usePointsManagement';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { toast } from 'sonner';

const trophies = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];

export function PointsManagementPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { data: board = [], isLoading } = useGroupLeaderboard(groupId!);
  const adjustPoints = useAdjustPoints(groupId!);

  const sorted = useMemo(() => [...board].sort((a, b) => b.points - a.points), [board]);

  const avgPoints = useMemo(() => {
    if (sorted.length === 0) return 0;
    return Math.round(sorted.reduce((sum, e) => sum + e.points, 0) / sorted.length);
  }, [sorted]);

  const topUser = sorted[0];

  const handleAdjust = async (userId: string, amount: number) => {
    await adjustPoints.mutateAsync({ userId, adjustment: amount });
    toast.success(`${amount > 0 ? '+' : ''}${amount} נקודות`);
  };

  return (
    <div className="page-bg" dir="rtl">
      <PageHeader
        icon={<BarChart3 className="w-5 h-5 text-white" />}
        title="ניהול נקודות"
        subtitle="דירוג ועדכון נקודות חברי הקבוצה"
      />

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="מוביל כללי"
            value={topUser?.user.name ?? '-'}
            icon={<Crown className="w-5 h-5" />}
            accent="amber"
            subtitle={topUser ? `${topUser.points} נק'` : undefined}
          />
          <StatCard
            label="סה״כ חברים"
            value={sorted.length}
            icon={<Trophy className="w-5 h-5" />}
            accent="blue"
          />
          <StatCard
            label="ממוצע נקודות"
            value={avgPoints}
            icon={<TrendingUp className="w-5 h-5" />}
            accent="green"
            subtitle="נק' לחבר"
          />
        </div>

        {/* Leaderboard */}
        <GlassCard className="overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              דירוג
            </h2>
            <p className="text-xs text-gray-500 mt-1">לחץ +/- לעדכן נקודות</p>
          </div>

          {isLoading ? (
            <div className="p-8 space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />)}
            </div>
          ) : sorted.length === 0 ? (
            <div className="p-8 text-center text-gray-500">אין נתונים</div>
          ) : (
            <div className="divide-y divide-white/5">
              {sorted.map((entry, idx) => {
                const maxPts = sorted[0]?.points || 1;
                const barWidth = maxPts > 0 ? (entry.points / maxPts) * 100 : 0;
                return (
                  <div key={entry.user.id} className="relative p-4 hover:bg-white/5 transition-colors">
                    {/* Background bar */}
                    <div
                      className="absolute inset-y-0 right-0 opacity-[0.06]"
                      style={{
                        width: `${barWidth}%`,
                        background: idx === 0 ? 'rgb(234,179,8)' : 'rgb(59,130,246)',
                      }}
                    />
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-yellow-500/30 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.3)]' :
                          idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                          idx === 2 ? 'bg-amber-600/30 text-amber-400' :
                          'bg-white/10 text-gray-400'
                        }`}>
                          {idx < 3 ? trophies[idx] : idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-white">{entry.user.name}</p>
                          <p className="text-xs text-gray-500">@{entry.user.username}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-amber-400 min-w-[60px] text-center">{entry.points} נק'</span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => handleAdjust(entry.user.id, e.shiftKey ? -5 : -1)}
                            disabled={adjustPoints.isPending}
                            className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/30 flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleAdjust(entry.user.id, e.shiftKey ? 5 : 1)}
                            disabled={adjustPoints.isPending}
                            className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 hover:border-green-500/30 flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
