import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupAdminApi } from '@/api/groupAdmin';
import { Template } from '@/types';
import { toast } from 'sonner';

export function useTemplates(groupId: string) {
  return useQuery({
    queryKey: ['group-admin', groupId, 'templates'],
    queryFn: () => groupAdminApi.getTemplates(groupId).then(r => r.templates),
    enabled: !!groupId,
  });
}

export function useCreateTemplate(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Template, 'id' | 'createdAt'>) =>
      groupAdminApi.createTemplate(groupId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-admin', groupId, 'templates'] });
      toast.success('התבנית נוצרה');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateTemplate(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: Partial<Template> }) =>
      groupAdminApi.updateTemplate(groupId, templateId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-admin', groupId, 'templates'] });
      toast.success('התבנית עודכנה');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteTemplate(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) => groupAdminApi.deleteTemplate(groupId, templateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-admin', groupId, 'templates'] });
      toast.success('התבנית נמחקה');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
