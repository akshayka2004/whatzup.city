// ─────────────────────────────────────────────────────────────────────
// Auth service — real API only, no mock fallback.
// All requests go through apiService (Next.js /api proxy → API server).
// ─────────────────────────────────────────────────────────────────────

import { apiService } from './api-service';

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

function mapRbacToRole(rbac: string): string {
  if (['BUSINESS_ADMIN', 'BUSINESS_OWNER', 'BUSINESS_MODERATOR', 'BUSINESS_STAFF'].includes(rbac)) return 'business';
  if (rbac === 'MASTER_ADMIN' || rbac === 'PORTAL_ADMIN') return 'admin';
  if (rbac === 'SUPER_ADMIN') return 'super-admin';
  if (rbac === 'GOVERNMENT_ADMIN') return 'government';
  return rbac.toLowerCase();
}

function persistUser(user: User): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('user_session', JSON.stringify(user));
  localStorage.setItem('user', JSON.stringify(user));
}

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
    const response = await apiService.get<any>('/v1/auth/me');
    if (!response.data || response.error) return null;
    const u = response.data;
    const apiUser: User = {
      id: u.id,
      email: u.email,
      name: u.name,
      role: mapRbacToRole(u.role),
      rbacRole: u.role,
      createdAt: new Date(),
      // businessId: staff members get it from /me directly; owners get it via entity
      businessId: u.businessId || (u.entity?.type === 'BUSINESS' ? u.entity.id : undefined),
      entity: u.entity,
    };
    persistUser(apiUser);
    return apiUser;
  }

  async selectRole(data: {
    role: string;
    entityType: string;
    name?: string;
    phone?: string;
  }): Promise<any> {
    const response = await apiService.post<any>('/v1/auth/select-role', data);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to select role');
    }
    await this.fetchCurrentUser();
    return response.data;
  }

  /**
   * Sign in — real API only. Throws on failure with API message.
   */
  async signIn(email: string, password: string): Promise<User | null> {
    const response = await apiService.post<any>('/v1/auth/login', { email, password });
    if (response.error || !response.data) {
      throw new Error(response.error || 'Login failed');
    }
    const u = response.data.user;
    const apiUser: User = {
      id: u.id,
      email: u.email,
      name: u.name,
      role: mapRbacToRole(u.role),
      rbacRole: u.role,
      createdAt: new Date(),
      // response.data.businessId — set for staff/moderator accounts (no entity)
      // u.businessId — set on the user sub-object (mirrors the same)
      // entity fallback — for business owners with entity
      businessId: response.data.businessId || u.businessId || (u.entity?.type === 'BUSINESS' ? u.entity.id : undefined),
      entity: u.entity || null,
    };
    persistUser(apiUser);
    return apiUser;
  }

  async signUp(email: string, password: string, name: string): Promise<User | null> {
    const response = await apiService.post<any>('/v1/auth/signup', { email, password, name });
    if (response.error || !response.data) {
      throw new Error(response.error || 'Registration failed');
    }
    const u = response.data.user;
    const apiUser: User = {
      id: u.id,
      email: u.email,
      name: u.name,
      role: 'user',
      rbacRole: 'USER',
      createdAt: new Date(),
    };
    persistUser(apiUser);
    return apiUser;
  }

  async businessSignup(data: any): Promise<{ user: User; businessId: string } | null> {
    const response = await apiService.post<any>('/v1/auth/business/signup', data);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Registration failed');
    }
    const u = response.data.user;
    const apiUser: User = {
      id: u.id,
      email: u.email,
      name: u.name,
      role: 'business',
      rbacRole: 'BUSINESS_OWNER',
      createdAt: new Date(),
    };
    persistUser(apiUser);
    return { user: apiUser, businessId: response.data.businessId };
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
