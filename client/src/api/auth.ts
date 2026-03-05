import { apiGet, apiPost } from './client';
import { SessionUser, Gender } from '@/types';

interface AuthResponse {
  user: SessionUser;
}

export const authApi = {
  login: (username: string, password: string) =>
    apiPost<AuthResponse>('/api/auth/login', { username, password }),

  register: (data: { username: string; password: string; name: string; gender: Gender }) =>
    apiPost<AuthResponse>('/api/auth/register', data),

  logout: () => apiPost<{ ok: boolean }>('/api/auth/logout', {}),

  me: () => apiGet<AuthResponse>('/api/auth/me'),
};
