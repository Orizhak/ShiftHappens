import { useQuery, useMutation } from '@tanstack/react-query';
import { groupAdminApi } from '@/api/groupAdmin';
import { AssignmentShiftData } from '@/types';
import { toast } from 'sonner';

export function useAssignmentCandidates(
  groupId: string,
  shiftData: AssignmentShiftData | null
) {
  return useQuery({
    queryKey: ['assignment', groupId, shiftData],
    queryFn: () => groupAdminApi.getAssignmentCandidates(groupId, shiftData!),
    enabled: !!groupId && !!shiftData,
    staleTime: 0, // Always fresh
  });
}

export function useAutoAssignment(groupId: string) {
  return useMutation({
    mutationFn: (shiftData: AssignmentShiftData) =>
      groupAdminApi.performAutoAssignment(groupId, shiftData),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useReplaceUser(groupId: string) {
  return useMutation({
    mutationFn: ({
      shiftData,
      currentUsers,
      userToReplace,
    }: {
      shiftData: AssignmentShiftData;
      currentUsers: string[];
      userToReplace: string;
    }) => groupAdminApi.replaceUserInAssignment(groupId, shiftData, currentUsers, userToReplace),
    onError: (err: Error) => toast.error(err.message),
  });
}
