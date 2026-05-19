import * as jwt from 'jsonwebtoken';
import { UserRole } from '@saas/types';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
}

export interface AuthConfig {
  jwtSecret: string;
  expiresIn: string;
}

/**
 * Verify JWT token and decode its payload
 */
export function verifyToken(token: string, secret: string): SessionUser | null {
  try {
    const decoded = jwt.verify(token, secret) as any;
    if (!decoded || !decoded.sub) return null;
    return {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name || '',
      role: decoded.role as UserRole,
      tenantId: decoded.tenantId || 'default',
    };
  } catch (error) {
    return null;
  }
}

/**
 * Helper to check if a user role matches or exceeds required role in hierarchy
 */
export function hasRequiredRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    [UserRole.SUPER_ADMIN]: 100,
    [UserRole.ADMIN]: 80,
    [UserRole.GOVERNMENT_AGENCY]: 60,
    [UserRole.BUSINESS_OWNER]: 40,
    [UserRole.BUSINESS_STAFF]: 30,
    [UserRole.PUBLIC_USER]: 20,
  };

  const userWeight = roleHierarchy[userRole] || 0;
  const requiredWeight = roleHierarchy[requiredRole] || 0;
  return userWeight >= requiredWeight;
}
