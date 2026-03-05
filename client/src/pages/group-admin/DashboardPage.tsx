import { useParams, useNavigate } from 'react-router-dom';
import { BarChart3, Users, Calendar, ClipboardList, Plus, ChevronLeft, FileText } from 'lucide-react';
import { useGroupShifts } from '@/hooks/groupAdmin/useGroupShifts';
import { useGroupUsers } from '@/hooks/groupAdmin/useGroupUsers';
import { useUserGroups } from '@/hooks/user/useGroups';
import { ShiftStatus } from '@/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function GroupAdminDashboardPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { data: shifts = [], isLoading: shiftsLoading } = useGroupShifts(groupId!);
  const { data: users = [], isLoading: usersLoading } = useGroupUsers(groupId!);
  const { data: groups = [] } = useUserGroups();

  const group = groups.find((g) => g.id === groupId);
  const upcomingShifts = shifts.filter(
    (s) => s.status === ShiftStatus.Active && new Date(s.startDate) > new Date()
  );

  const isLoading = shiftsLoading || usersLoading;

  const quickActions = [
    { label: 'יצירת משמרת', icon: Plus, color: 'blue', path: `CreateShift` },
    { label: 'ניהול משמרות', icon: Calendar, color: 'green', path: `shifts` },
    { label: 'בקשות', icon: ClipboardList, color: 'amber', path: `requests` },
    { label: 'נקודות', icon: BarChart3, color: 'purple', path: `points` },
    { label: 'תבניות', icon: FileText, color: 'teal', path: `templates` },
    { label: 'ניהול משתמשים', icon: Users, color: 'indigo', path: `usersManagement` },
  ];

  const colorMap: Record<string, string> = {
    blue: 'from-blue-500/15 to-blue-600/5 border-blue-500/20 text-blue-400 hover:from-blue-500/25',
    green: 'from-green-500/15 to-green-600/5 border-green-500/20 text-green-400 hover:from-green-500/25',
    amber: 'from-amber-500/15 to-amber-600/5 border-amber-500/20 text-amber-400 hover:from-amber-500/25',
    purple: 'from-purple-500/15 to-purple-600/5 border-purple-500/20 text-purple-400 hover:from-purple-500/25',
    teal: 'from-teal-500/15 to-teal-600/5 border-teal-500/20 text-teal-400 hover:from-teal-500/25',
    indigo: 'from-indigo-500/15 to-indigo-600/5 border-indigo-500/20 text-indigo-400 hover:from-indigo-500/25',
  };

  return (
    <div className="page-bg" dir="rtl">
      <PageHeader
        icon={<BarChart3 className="w-5 h-5 text-white" />}
        title={group ? `ניהול קבוצת ${group.displayName}` : 'לוח בקרה מנהל'}
        subtitle="ברוך הבא לממשק הניהול"
      />

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GlassCard className="p-5 bg-gradient-to-br from-blue-500/15 to-blue-600/5 border-blue-500/20" glow="blue">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-400">חברי קבוצה</p>
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-white">{isLoading ? '...' : users.length}</p>
          </GlassCard>
          <GlassCard className="p-5 bg-gradient-to-br from-green-500/15 to-green-600/5 border-green-500/20" glow="green">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-400">משמרות קרובות</p>
              <Calendar className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-white">{isLoading ? '...' : upcomingShifts.length}</p>
          </GlassCard>
          <GlassCard className="p-5 bg-gradient-to-br from-amber-500/15 to-amber-600/5 border-amber-500/20" glow="amber">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-400">סה"כ משמרות</p>
              <ClipboardList className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-3xl font-bold text-white">{isLoading ? '...' : shifts.length}</p>
          </GlassCard>
        </div>

        {/* Quick actions */}
        <GlassCard className="p-5">
          <h2 className="text-lg font-semibold mb-4 text-white">פעולות מהירות</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.path}
                  onClick={() => navigate(`/group-admin/${groupId}/${action.path}`)}
                  className={`flex flex-col items-center gap-2 p-4 bg-gradient-to-br border rounded-xl transition-all ${colorMap[action.color]}`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-sm">{action.label}</span>
                </button>
              );
            })}
          </div>
        </GlassCard>

        {/* Recent shifts */}
        <GlassCard className="overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">משמרות אחרונות</h2>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">טוען...</div>
          ) : shifts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">אין משמרות עדיין</div>
          ) : (
            <ul className="divide-y divide-white/5">
              {shifts.slice(0, 5).map((shift) => (
                <li key={shift.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-white">{shift.displayName}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(shift.startDate).toLocaleDateString('he-IL')} ·{' '}
                      {shift.users?.length ?? 0} משתמשים
                    </p>
                  </div>
                  <StatusBadge type="shift-status" value={shift.status} />
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
