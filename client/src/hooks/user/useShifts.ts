import { useQuery } from '@tanstack/react-query';
import { userApi } from '@/api/user';

export function useUpcomingShifts() {
  return useQuery({
    queryKey: ['user', 'shifts', 'upcoming'],
    queryFn: () => userApi.getUpcomingShifts().then((r) => r.shifts),
  });
}

export function useAllShifts() {
  return useQuery({
    queryKey: ['user', 'shifts', 'all'],
    queryFn: () => userApi.getAllShifts().then((r) => r.shifts),
  });
}
