'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, User, UserRole } from '@/lib/services/auth-service';
import { useRouter } from 'next/navigation';

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
    
    // Check for Business and other specialized entity roles
    const isBusinessOrEntity = 
      u.role === 'business' ||
      u.role === 'business_moderator' ||
      u.role === 'business_staff' ||
      u.role === 'influencer' ||
      u.role === 'professional' ||
      u.role === 'event-organizer' ||
      u.role === 'organization' ||
      u.role === 'event_organizer' ||
      u.role === 'organization_admin' ||
      [
        'BUSINESS_OWNER',
        'BUSINESS_ADMIN',
        'BUSINESS_MODERATOR',
        'BUSINESS_STAFF',
        'INFLUENCER',
        'PROFESSIONAL',
        'EVENT_ORGANIZER',
        'ORGANIZATION_ADMIN'
      ].includes(u.rbacRole || '');

    if (isBusinessOrEntity) {
      if (u.entity?.status === 'DRAFT') {
        const type = u.entity.type;
        if (type === 'INFLUENCER') return `/register/influencer?id=${u.entity.id}`;
        if (type === 'PROFESSIONAL') return `/register/professional?id=${u.entity.id}`;
        if (type === 'EVENT_ORGANIZER') return `/register/event-organizer?id=${u.entity.id}`;
        if (type === 'ORGANIZATION') return `/register/ngo?id=${u.entity.id}`;
        return `/register/business?id=${u.entity.id}`;
      }
      return '/dashboard';
    }
    return '/';
  };

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      // Login response now includes entity — no second roundtrip needed for redirect
      const loggedInUser = await authService.signIn(email, password);
      if (loggedInUser) {
        setUser(loggedInUser);
        router.push(resolveRedirect(loggedInUser));
        // Background refresh: loads full permissions without blocking redirect
        authService.fetchCurrentUser()
          .then((fresh) => { if (fresh) setUser(fresh); })
          .catch(() => {});
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      throw error; // re-throw so login page shows real API error message
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

  const switchRole = (_role: string) => {
    // Role switching is intentionally a no-op — real auth requires real credentials.
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
