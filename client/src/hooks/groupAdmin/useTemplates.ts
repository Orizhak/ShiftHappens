import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupAdminApi } from '@/api/groupAdmin';
import { Template } from '@/types';

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group-admin', groupId, 'templates'] }),
  });
}

export function useUpdateTemplate(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: Partial<Template> }) =>
      groupAdminApi.updateTemplate(groupId, templateId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group-admin', groupId, 'templates'] }),
  });
}

export function useDeleteTemplate(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) => groupAdminApi.deleteTemplate(groupId, templateId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group-admin', groupId, 'templates'] }),
  });
}
