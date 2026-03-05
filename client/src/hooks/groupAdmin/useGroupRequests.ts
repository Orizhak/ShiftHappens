import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupAdminApi } from '@/api/groupAdmin';

export function useGroupRequests(groupId: string) {
  return useQuery({
    queryKey: ['group-admin', groupId, 'requests'],
    queryFn: () => groupAdminApi.getGroupRequests(groupId).then(r => r.requests),
    enabled: !!groupId,
  });
}

export function useDeleteGroupRequest(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => groupAdminApi.deleteGroupRequest(groupId, requestId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group-admin', groupId, 'requests'] }),
  });
}
