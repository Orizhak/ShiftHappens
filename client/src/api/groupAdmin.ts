import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import { Shift, UserFitness, AssignmentShiftData, UserCategory, Request as AppRequest, Template } from '@/types';

type SafeUser = Omit<import('@/types').SessionUser, 'password'>;

export const groupAdminApi = {
  // ─── Shifts ────────────────────────────────────────────────────────────────
  getShifts: (groupId: string) =>
    apiGet<{ shifts: Shift[] }>(`/api/group-admin/${groupId}/shifts`),

  getShift: (groupId: string, shiftId: string) =>
    apiGet<{ shift: Shift }>(`/api/group-admin/${groupId}/shifts/${shiftId}`),

  createShift: (groupId: string, data: Omit<Shift, 'id' | 'groupId' | 'createdAt'>) =>
    apiPost<{ shift: Shift }>(`/api/group-admin/${groupId}/shifts`, data),

  updateShift: (groupId: string, shiftId: string, data: Partial<Shift>) =>
    apiPatch<{ ok: boolean }>(`/api/group-admin/${groupId}/shifts/${shiftId}`, data),

  deleteShift: (groupId: string, shiftId: string) =>
    apiDelete<{ ok: boolean }>(`/api/group-admin/${groupId}/shifts/${shiftId}`),

  // ─── Assignment ─────────────────────────────────────────────────────────────
  getAssignmentCandidates: (groupId: string, shiftData: AssignmentShiftData) =>
    apiPost<{ users: UserFitness[]; totalUsers: number; fitUsers: number }>(
      `/api/group-admin/${groupId}/assignment/candidates`,
      { shiftData }
    ),

  performAutoAssignment: (groupId: string, shiftData: AssignmentShiftData) =>
    apiPost<{ userIds: string[] }>(
      `/api/group-admin/${groupId}/assignment/auto`,
      { shiftData }
    ),

  replaceUserInAssignment: (
    groupId: string,
    shiftData: AssignmentShiftData,
    currentUsers: string[],
    userToReplace: string
  ) =>
    apiPost<{ userIds: string[] }>(
      `/api/group-admin/${groupId}/assignment/replace`,
      { shiftData, currentUsers, userToReplace }
    ),

  // ─── Users ──────────────────────────────────────────────────────────────────
  getUsers: (groupId: string) =>
    apiGet<{ users: SafeUser[] }>(`/api/group-admin/${groupId}/users`),

  updateUserRole: (
    groupId: string,
    userId: string,
    action: 'makeAdmin' | 'removeAdmin' | 'removeFromGroup'
  ) => apiPatch<{ ok: boolean }>(`/api/group-admin/${groupId}/users/${userId}/role`, { action }),

  updateUserCategories: (groupId: string, userId: string, userCategories: string[]) =>
    apiPatch<{ ok: boolean }>(`/api/group-admin/${groupId}/users/${userId}/categories`, {
      userCategories,
    }),

  getAvailableUsers: (groupId: string) =>
    apiGet<{ users: SafeUser[] }>(`/api/group-admin/${groupId}/available-users`),

  addUsersToGroup: (groupId: string, userIds: string[]) =>
    apiPost<{ ok: boolean }>(`/api/group-admin/${groupId}/users/add`, { userIds }),

  // ─── Leaderboard ────────────────────────────────────────────────────────────
  getLeaderboard: (groupId: string) =>
    apiGet<{ leaderboard: { user: SafeUser; points: number }[] }>(
      `/api/group-admin/${groupId}/leaderboard`
    ),

  // ─── Categories ─────────────────────────────────────────────────────────────
  getCategories: (groupId: string) =>
    apiGet<{ categories: UserCategory[] }>(`/api/group-admin/${groupId}/categories`),

  // ─── Requests (admin view) ────────────────────────────────────────────────
  getGroupRequests: (groupId: string) =>
    apiGet<{ requests: (AppRequest & { userName: string })[] }>(`/api/group-admin/${groupId}/requests`),

  deleteGroupRequest: (groupId: string, requestId: string) =>
    apiDelete<{ ok: boolean }>(`/api/group-admin/${groupId}/requests/${requestId}`),

  // ─── Points management ────────────────────────────────────────────────────
  adjustPoints: (groupId: string, userId: string, adjustment: number) =>
    apiPatch<{ ok: boolean }>(`/api/group-admin/${groupId}/points/${userId}`, { adjustment }),

  // ─── Templates CRUD ───────────────────────────────────────────────────────
  getTemplates: (groupId: string) =>
    apiGet<{ templates: Template[] }>(`/api/group-admin/${groupId}/templates`),

  createTemplate: (groupId: string, data: Omit<Template, 'id' | 'groupId' | 'createdAt'>) =>
    apiPost<{ template: Template }>(`/api/group-admin/${groupId}/templates`, data),

  updateTemplate: (groupId: string, templateId: string, data: Partial<Template>) =>
    apiPatch<{ ok: boolean }>(`/api/group-admin/${groupId}/templates/${templateId}`, data),

  deleteTemplate: (groupId: string, templateId: string) =>
    apiDelete<{ ok: boolean }>(`/api/group-admin/${groupId}/templates/${templateId}`),

};
