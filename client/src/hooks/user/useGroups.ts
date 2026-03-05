import { useQuery } from '@tanstack/react-query';
import { userApi } from '@/api/user';

/** All groups the user belongs to (including admin groups) */
export function useUserGroups() {
  return useQuery({
    queryKey: ['user-groups'],
    queryFn: () => userApi.getGroups().then((r) => r.groups),
  });
}

/** Only groups where user is NOT admin — for user-facing pages */
export function useNonAdminGroups() {
  return useQuery({
    queryKey: ['user-groups'],
    queryFn: () => userApi.getGroups().then((r) => r.groups),
    select: (groups) => groups.filter((g) => !g.isAdmin),
  });
}
