'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, User, UserRole } from '@/lib/services/auth-service';
import { useRouter } from 'next/navigation';
import { initMockDb } from '@/lib/mock-db';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  switchRole: (role: string) => void;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Boot mock DB first (wipes stale data if version changed)
    initMockDb();

    async function initAuth() {
      try {
        // 1. Instant paint from localStorage cache so UI doesn't flash logged-out
        const cached = await authService.getCurrentUser();
        if (cached) setUser(cached);

        // 2. Source-of-truth check against API — uses httpOnly cookies.
        //    apiService auto-refreshes on 401, so a valid refresh_token (7d)
        //    keeps the session alive across reloads even after the 15-min
        //    access token expires.
        const fresh = await authService.fetchCurrentUser();
        if (fresh) {
          setUser(fresh);
        } else if (cached) {
          // Cookies invalid → clear stale cache so UI reflects logged-out state
          setUser(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('user_session');
            localStorage.removeItem('user');
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  const resolveRedirect = (u: User) => {
    if (u.role === 'super-admin' || u.rbacRole === 'SUPER_ADMIN') {
      return '/super-admin/tenants';
    }
    if (u.role === 'admin' || u.rbacRole === 'MASTER_ADMIN') {
      return '/admin';
    }
    if (u.role === 'government' || u.rbacRole === 'GOVERNMENT_ADMIN') {
      return '/government/dashboard';
    }
    if (u.role === 'business' || u.rbacRole === 'BUSINESS_OWNER' || u.rbacRole === 'BUSINESS_ADMIN' || u.rbacRole === 'BUSINESS_MODERATOR') {
      if (u.entity?.status === 'DRAFT') {
        return `/register/business?id=${u.entity.id}`;
      }
      return '/dashboard';
    }
    return '/';
  };

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const loggedInUser = await authService.signIn(email, password);
      if (loggedInUser) {
        // Try to fetch full profile; fall back to signIn result
        const activeUser = (await authService.fetchCurrentUser()) || loggedInUser;
        setUser(activeUser);
        router.push(resolveRedirect(activeUser));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async (): Promise<User | null> => {
    try {
      const currentUser = await authService.fetchCurrentUser();
      if (currentUser) setUser(currentUser);
      return currentUser || null;
    } catch {
      return null;
    }
  };

  const switchRole = (role: string) => {
    // Dev helper — swap mock user in localStorage and reload
    const mockMap: Record<string, string> = {
      user: 'user@platform.com',
      business: 'business@platform.com',
      moderator: 'moderator@platform.com',
      admin: 'admin@platform.com',
      'super-admin': 'superadmin@platform.com',
      government: 'government@platform.com',
    };
    const email = mockMap[role];
    if (!email) return;
    // Trigger a mock signIn via authService and reload
    authService.signIn(email, 'password123').then((u) => {
      if (u) {
        setUser(u);
        router.push(resolveRedirect(u));
      }
    });
  };

  const signUp = async (email: string, password: string, name: string): Promise<boolean> => {
    setLoading(true);
    try {
      const newUser = await authService.signUp(email, password, name);
      if (newUser) {
        const activeUser = (await authService.fetchCurrentUser()) || newUser;
        setUser(activeUser);
        router.push('/register/select-role');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };



  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, switchRole, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
