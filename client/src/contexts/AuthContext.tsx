import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SessionUser } from '@/types';
import { authApi } from '@/api/auth';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: SessionUser | null;
  isLoading: boolean;
  setUser: (user: SessionUser | null) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // On mount: restore session from cookie via /api/auth/me
  useEffect(() => {
    authApi
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const signOut = useCallback(async () => {
    await authApi.logout();
    queryClient.clear();
    setUser(null);
    navigate('/auth/login');
  }, [navigate, queryClient]);

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
