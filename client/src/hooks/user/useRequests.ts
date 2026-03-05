import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/api/user';
import { RequestType } from '@/types';
import { toast } from 'sonner';

export function useRequests() {
  return useQuery({
    queryKey: ['user', 'requests'],
    queryFn: () => userApi.getRequests().then((r) => r.requests),
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      startDate: string;
      endDate: string;
      type: RequestType;
      description: string;
    }) => userApi.createRequest(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', 'requests'] });
      toast.success('הבקשה נשמרה בהצלחה');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userApi.deleteRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', 'requests'] });
      toast.success('הבקשה נמחקה');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
