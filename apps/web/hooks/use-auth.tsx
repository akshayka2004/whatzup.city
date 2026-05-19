'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, User, UserRole, MOCK_USERS } from '@/lib/services/auth-service';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function initAuth() {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const loggedInUser = await authService.signIn(email, password);
      if (loggedInUser) {
        setUser(loggedInUser);
        // Redirect to appropriate dashboard based on role
        if (loggedInUser.role === 'business') {
          router.push('/dashboard');
        } else if (loggedInUser.role === 'admin') {
          router.push('/admin/approvals');
        } else if (loggedInUser.role === 'super-admin') {
          router.push('/super-admin/tenants');
        } else {
          router.push('/');
        }
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

  const signUp = async (email: string, password: string, name: string): Promise<boolean> => {
    setLoading(true);
    try {
      const newUser = await authService.signUp(email, password, name);
      if (newUser) {
        setUser(newUser);
        router.push('/');
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

  const switchRole = (role: UserRole) => {
    setLoading(true);
    const selectedUser = MOCK_USERS[role];
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_session', JSON.stringify(selectedUser));
      setUser(selectedUser);

      // Redirect based on the chosen role
      if (role === 'business') {
        router.push('/dashboard');
      } else if (role === 'admin') {
        router.push('/admin/approvals');
      } else if (role === 'super-admin') {
        router.push('/super-admin/tenants');
      } else {
        router.push('/');
      }
    }
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, switchRole }}>
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
