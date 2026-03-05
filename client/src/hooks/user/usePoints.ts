import { useQuery } from '@tanstack/react-query';
import { userApi } from '@/api/user';

export function useUserPoints() {
  return useQuery({
    queryKey: ['user', 'points'],
    queryFn: () => userApi.getPoints().then((r) => r.points),
  });
}

export function useGroupLeaderboard(groupId: string) {
  return useQuery({
    queryKey: ['user', 'leaderboard', groupId],
    queryFn: () => userApi.getLeaderboard(groupId).then((r) => r.leaderboard),
    enabled: !!groupId,
  });
}

export function useUserRank(groupId: string) {
  return useQuery({
    queryKey: ['user', 'rank', groupId],
    queryFn: () => userApi.getRank(groupId).then((r) => r.rank),
    enabled: !!groupId,
  });
}

export function useGroupStats(groupId: string) {
  return useQuery({
    queryKey: ['user', 'stats', groupId],
    queryFn: () => userApi.getGroupStats(groupId),
    enabled: !!groupId,
  });
}
