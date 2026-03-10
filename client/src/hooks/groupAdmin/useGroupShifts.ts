import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupAdminApi } from '@/api/groupAdmin';
import { Shift } from '@/types';
import { toast } from 'sonner';

export function useGroupShifts(groupId: string) {
  return useQuery({
    queryKey: ['group-admin', groupId, 'shifts'],
    queryFn: () => groupAdminApi.getShifts(groupId).then((r) => r.shifts),
    enabled: !!groupId,
  });
}

export function useCreateShift(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      groupAdminApi.createShift(groupId, data as Omit<Shift, 'id' | 'groupId' | 'createdAt'>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-admin', groupId, 'shifts'] });
      toast.success('המשמרת נוצרה בהצלחה');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateShift(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ shiftId, data }: { shiftId: string; data: Partial<Shift> }) =>
      groupAdminApi.updateShift(groupId, shiftId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['group-admin', groupId, 'shifts'] });
      // If status changed (finish/cancel), also invalidate points-related queries
      if (variables.data.status !== undefined) {
        qc.invalidateQueries({ queryKey: ['group-admin', groupId, 'leaderboard'] });
        qc.invalidateQueries({ queryKey: ['user', 'points'] });
        qc.invalidateQueries({ queryKey: ['user', 'leaderboard'] });
        qc.invalidateQueries({ queryKey: ['user', 'rank'] });
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteShift(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shiftId: string) => groupAdminApi.deleteShift(groupId, shiftId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-admin', groupId, 'shifts'] });
      toast.success('המשמרת נמחקה');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
