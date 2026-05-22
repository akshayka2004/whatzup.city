// Auth service - Mock implementation for SaaS platform roles
//
// Dev Credentials (all password: password123):
// ─────────────────────────────────────────────
//  1. Customer        user@platform.com
//  2. Business Owner  business@platform.com
//  3. Biz Moderator   moderator@platform.com
//  4. Portal Admin    admin@platform.com
//  5. Super Admin     superadmin@platform.com
//  6. Government      government@platform.com

export type UserRole =
  | 'user'
  | 'business'
  | 'admin'
  | 'super-admin'
  | 'government';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  /** Explicit RBAC role from rbac.ts UserRole enum */
  rbacRole?: string;
  createdAt: Date;
  businessId?: string;
  entity?: {
    id: string;
    type: string;
    status: string;
    name: string;
    profile?: any;
  } | null;
}



import { apiService } from './api-service';
import { getUserByEmail, addUser, MockUser } from '@/lib/mock-db';

// ── Legacy in-memory fallback (mock-db is primary source) ────────────
// IDs aligned with mock-db SEED_USERS. Used only when mock-db not yet initialised.
const MOCK_USERS: User[] = [
  { id: 'mock-user-1', email: 'user@platform.com', name: 'Alex Customer', role: 'user', rbacRole: 'USER', createdAt: new Date('2024-01-01') },
  { id: 'mock-biz-owner-1', email: 'business@platform.com', name: 'John Business', role: 'business', rbacRole: 'BUSINESS_OWNER', createdAt: new Date('2024-01-01'), businessId: 'mock-biz-001', entity: { id: 'mock-biz-001', type: 'BUSINESS', status: 'ACTIVE', name: 'Sunrise Café' } },
  { id: 'mock-biz-mod-1', email: 'moderator@platform.com', name: 'Sam Moderator', role: 'business', rbacRole: 'BUSINESS_MODERATOR', createdAt: new Date('2024-01-01'), businessId: 'mock-biz-001', entity: { id: 'mock-biz-001', type: 'BUSINESS', status: 'ACTIVE', name: 'Sunrise Café' } },
  { id: 'mock-admin-1', email: 'admin@platform.com', name: 'Rita Admin', role: 'admin', rbacRole: 'MASTER_ADMIN', createdAt: new Date('2024-01-01') },
  { id: 'mock-super-1', email: 'superadmin@platform.com', name: 'Dev Super', role: 'super-admin', rbacRole: 'SUPER_ADMIN', createdAt: new Date('2024-01-01') },
  { id: 'mock-gov-1', email: 'government@platform.com', name: 'Gov Officer', role: 'government', rbacRole: 'GOVERNMENT_ADMIN', createdAt: new Date('2024-01-01') },
];

class AuthService {
  async getCurrentUser(): Promise<User | null> {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('user_session') || localStorage.getItem('user');
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      return { ...parsed, createdAt: new Date(parsed.createdAt) };
    } catch {
      return null;
    }
  }

  async signOut(): Promise<void> {
    try {
      await apiService.post('/v1/auth/logout');
    } catch (_) {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_session');
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  async fetchCurrentUser(): Promise<User | null> {
    try {
      const response = await apiService.get<any>('/v1/auth/me');
      if (response.data && !response.error) {
        const u = response.data;
        const apiUser: User = {
          id: u.id,
          email: u.email,
          name: u.name,
          role:
            u.role === 'BUSINESS_ADMIN' || u.role === 'BUSINESS_OWNER'
              ? 'business'
              : u.role === 'MASTER_ADMIN'
                ? 'admin'
                : u.role === 'SUPER_ADMIN'
                  ? 'super-admin'
                  : u.role === 'GOVERNMENT_ADMIN'
                    ? 'government'
                    : u.role.toLowerCase(),
          rbacRole: u.role,
          createdAt: new Date(),
          businessId: u.entity?.type === 'BUSINESS' ? u.entity.id : undefined,
          entity: u.entity,
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_session', JSON.stringify(apiUser));
          localStorage.setItem('user', JSON.stringify(apiUser));
        }
        return apiUser;
      }
    } catch (_) {}
    return null;
  }

  async selectRole(data: {
    role: string;
    entityType: string;
    name?: string;
    phone?: string;
  }): Promise<any> {
    try {
      const response = await apiService.post<any>('/v1/auth/select-role', data);
      if (response.data && !response.error) {
        await this.fetchCurrentUser();
        return response.data;
      }
      throw new Error(response.error || 'Failed to select role');
    } catch (e: any) {
      throw new Error(e?.message || 'Failed to select role');
    }
  }

  async signIn(email: string, password: string): Promise<User | null> {
    // Try real API first
    try {
      const response = await apiService.post<any>('/v1/auth/login', { email, password });
      if (response.data && !response.error) {
        const u = response.data.user;
        const apiUser: User = {
          id: u.id,
          email: u.email,
          name: u.name,
          role:
            u.role === 'BUSINESS_ADMIN' || u.role === 'BUSINESS_OWNER'
              ? 'business'
              : u.role === 'MASTER_ADMIN'
                ? 'admin'
                : u.role === 'SUPER_ADMIN'
                  ? 'super-admin'
                  : u.role === 'GOVERNMENT_ADMIN'
                    ? 'government'
                    : u.role.toLowerCase(),
          rbacRole: u.role,
          createdAt: new Date(),
          businessId: response.data.businessId,
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_session', JSON.stringify(apiUser));
          localStorage.setItem('user', JSON.stringify(apiUser));
        }
        return apiUser;
      }
    } catch (_) {}

    // Mock fallback — check MOCK_USERS first, then mock-db (for newly registered users)
    const dbUser = getUserByEmail(email);
    if (dbUser && (password === dbUser.password || password === 'password123')) {
      const user: User = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        rbacRole: dbUser.rbacRole,
        createdAt: new Date(dbUser.createdAt),
        businessId: dbUser.businessId,
        entity: dbUser.entity ?? null,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_session', JSON.stringify(user));
        localStorage.setItem('user', JSON.stringify(user));
      }
      return user;
    }
    // Legacy MOCK_USERS fallback (in case mock-db not yet seeded)
    if (password === 'password123') {
      const mockUser = MOCK_USERS.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (mockUser) {
        const user = { ...mockUser, createdAt: new Date() };
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_session', JSON.stringify(user));
          localStorage.setItem('user', JSON.stringify(user));
        }
        return user;
      }
    }
    return null;
  }

  async signUp(email: string, password: string, name: string): Promise<User | null> {
    try {
      const response = await apiService.post<any>('/v1/auth/signup', { email, password, name });
      if (response.data && !response.error) {
        const apiUser: User = {
          id: response.data.user.id,
          email: response.data.user.email,
          name: response.data.user.name,
          role: 'user',
          rbacRole: 'USER',
          createdAt: new Date(),
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_session', JSON.stringify(apiUser));
          localStorage.setItem('user', JSON.stringify(apiUser));
        }
        return apiUser;
      }
    } catch (_) {}
    return null;
  }

  async businessSignup(data: any): Promise<{ user: User; businessId: string } | null> {
    try {
      const response = await apiService.post<any>('/v1/auth/business/signup', data);
      if (response.data && !response.error) {
        const apiUser: User = {
          id: response.data.user.id,
          email: response.data.user.email,
          name: response.data.user.name,
          role: 'business',
          rbacRole: 'BUSINESS_OWNER',
          createdAt: new Date(),
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_session', JSON.stringify(apiUser));
          localStorage.setItem('user', JSON.stringify(apiUser));
        }
        return { user: apiUser, businessId: response.data.businessId };
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (e: any) {
      throw new Error(e?.message || 'Registration failed');
    }
  }

  hasRole(user: User | null, requiredRole: string): boolean {
    if (!user) return false;
    const roleHierarchy: Record<string, number> = {
      user: 1,
      government: 2,
      business: 3,
      admin: 4,
      'super-admin': 5,
    };
    const userVal = roleHierarchy[user.role] || 1;
    const reqVal = roleHierarchy[requiredRole] || 1;
    return userVal >= reqVal;
  }
}

export const authService = new AuthService();
