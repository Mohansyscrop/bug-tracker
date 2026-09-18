'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, ApiError } from '@/lib/api';
import { useRouter } from 'next/navigation';

export interface ProjectMemberItem {
  projectId: string;
  projectRole: string;
  project?: {
    id: string;
    name: string;
    key: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  globalRole: string;
  createdAt: string;
  projectMembers?: ProjectMemberItem[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    authApi.me()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const loggedUser = res.data;
    setUser(loggedUser);
    const isDev = loggedUser.projectMembers?.some((m: any) =>
      m.projectRole?.includes('DEV') || m.projectRole === 'DEVELOPER'
    );
    if (isDev && loggedUser.globalRole !== 'ADMIN') {
      router.push('/developer');
    } else {
      router.push('/dashboard');
    }
  }, [router]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await authApi.register(name, email, password);
    setUser(res.data);
    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => { });
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
