import { useMutation, useQueryClient } from '@tanstack/react-query';
import { groupAdminApi } from '@/api/groupAdmin';

export function useAdjustPoints(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, adjustment }: { userId: string; adjustment: number }) =>
      groupAdminApi.adjustPoints(groupId, userId, adjustment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-admin', groupId, 'leaderboard'] });
    },
  });
}
