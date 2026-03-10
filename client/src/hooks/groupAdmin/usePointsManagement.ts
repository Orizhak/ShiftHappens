import { useMutation, useQueryClient } from '@tanstack/react-query';
import { groupAdminApi } from '@/api/groupAdmin';
import { toast } from 'sonner';

export function useAdjustPoints(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, adjustment }: { userId: string; adjustment: number }) =>
      groupAdminApi.adjustPoints(groupId, userId, adjustment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-admin', groupId, 'leaderboard'] });
      qc.invalidateQueries({ queryKey: ['user', 'points'] });
      qc.invalidateQueries({ queryKey: ['user', 'leaderboard'] });
      qc.invalidateQueries({ queryKey: ['user', 'rank'] });
      toast.success('הנקודות עודכנו');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
