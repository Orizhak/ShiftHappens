import { apiGet, apiPost, apiDelete } from './client';
import { Shift, Group, UserGroupPoints, Request, RequestType } from '@/types';

interface LeaderboardEntry {
  user: { id: string; name: string; username: string };
  points: number;
}

export const userApi = {
  // Shifts
  getUpcomingShifts: () =>
    apiGet<{ shifts: Shift[] }>('/api/user/shifts/upcoming'),

  getAllShifts: () =>
    apiGet<{ shifts: Shift[] }>('/api/user/shifts'),

  // Groups
  getGroups: () =>
    apiGet<{ groups: Group[] }>('/api/user/groups'),

  // Points
  getPoints: () =>
    apiGet<{ points: UserGroupPoints[] }>('/api/user/points'),

  getLeaderboard: (groupId: string) =>
    apiGet<{ leaderboard: LeaderboardEntry[] }>(`/api/user/points/leaderboard/${groupId}`),

  getRank: (groupId: string) =>
    apiGet<{ rank: number }>(`/api/user/rank/${groupId}`),

  // Stats
  getGroupStats: (groupId: string) =>
    apiGet<{ weeklyShifts: number; monthlyShifts: number; groupName: string }>(
      `/api/user/stats/${groupId}`
    ),

  // Requests
  getRequests: () =>
    apiGet<{ requests: Request[] }>('/api/user/requests'),

  createRequest: (data: {
    startDate: string;
    endDate: string;
    type: RequestType;
    description: string;
  }) => apiPost<{ request: Request }>('/api/user/requests', data),

  deleteRequest: (id: string) =>
    apiDelete<{ ok: boolean }>(`/api/user/requests/${id}`),
};
