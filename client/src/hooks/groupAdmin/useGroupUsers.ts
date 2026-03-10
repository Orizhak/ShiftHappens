import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupAdminApi } from '@/api/groupAdmin';
import { toast } from 'sonner';

export function useGroupUsers(groupId: string) {
  return useQuery({
    queryKey: ['group-admin', groupId, 'users'],
    queryFn: () => groupAdminApi.getUsers(groupId).then((r) => r.users),
    enabled: !!groupId,
  });
}

export function useUpdateUserRole(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      action,
    }: {
      userId: string;
      action: 'makeAdmin' | 'removeAdmin' | 'removeFromGroup';
    }) => groupAdminApi.updateUserRole(groupId, userId, action),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['group-admin', groupId, 'users'] });
      if (variables.action === 'removeFromGroup') {
        qc.invalidateQueries({ queryKey: ['group-admin', groupId, 'leaderboard'] });
        qc.invalidateQueries({ queryKey: ['group-admin', groupId, 'shifts'] });
        qc.invalidateQueries({ queryKey: ['user', 'points'] });
      }
      toast.success('המשתמש עודכן');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateUserCategories(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, categories }: { userId: string; categories: string[] }) =>
      groupAdminApi.updateUserCategories(groupId, userId, categories),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-admin', groupId, 'users'] });
      qc.invalidateQueries({ queryKey: ['assignment'] });
      toast.success('קטגוריות עודכנו');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAddUsersToGroup(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) => groupAdminApi.addUsersToGroup(groupId, userIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-admin', groupId, 'users'] });
      qc.invalidateQueries({ queryKey: ['group-admin', groupId, 'available-users'] });
      toast.success('המשתמשים נוספו לקבוצה');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAvailableUsers(groupId: string, enabled = false) {
  return useQuery({
    queryKey: ['group-admin', groupId, 'available-users'],
    queryFn: () => groupAdminApi.getAvailableUsers(groupId).then((r) => r.users),
    enabled: !!groupId && enabled,
  });
}

export function useGroupLeaderboard(groupId: string) {
  return useQuery({
    queryKey: ['group-admin', groupId, 'leaderboard'],
    queryFn: () => groupAdminApi.getLeaderboard(groupId).then((r) => r.leaderboard),
    enabled: !!groupId,
  });
}

export function useGroupCategories(groupId: string) {
  return useQuery({
    queryKey: ['group-admin', groupId, 'categories'],
    queryFn: () => groupAdminApi.getCategories(groupId).then((r) => r.categories),
    enabled: !!groupId,
  });
}
