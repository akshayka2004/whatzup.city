// ============================================================
// Role Guard — RBAC enforcement with role hierarchy
// ============================================================

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import {
  UserRole,
  GRANT_ROLES,
  areaForRoute,
  effectiveGrants,
  grantAllows,
  levelForMethod,
} from '@saas/types';

const ROLE_HIERARCHY: Record<string, number> = {
  [UserRole.USER]: 1,
  [UserRole.BUSINESS_STAFF]: 2,
  [UserRole.BUSINESS_MODERATOR]: 3,
  [UserRole.BUSINESS_OWNER]: 4,
  // Specialty entity roles — same tier as BUSINESS_OWNER
  [UserRole.INFLUENCER]: 4,
  [UserRole.PROFESSIONAL]: 4,
  [UserRole.EVENT_ORGANIZER]: 4,
  [UserRole.ORGANIZATION_ADMIN]: 4,
  // Civic registration roles — same tier as entity owners
  [UserRole.NGO_ADMIN]: 4,
  [UserRole.COMMUNITY_ADMIN]: 4,
  [UserRole.NEWS_FORUM_ADMIN]: 4,
  [UserRole.GOVERNMENT_ADMIN]: 5,
  [UserRole.MASTER_ADMIN]: 6,
  [UserRole.SUPER_ADMIN]: 7,
  // Legacy alias kept for backward compatibility
  [UserRole.BUSINESS_ADMIN]: 4,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Portal admins and staff: where a route belongs to an area, their grants decide, whatever
    // roles the route lists. Routes only a super admin may use (and routes with no area) keep the
    // plain role check below, so a grant can never open something it was not meant to.
    if ((GRANT_ROLES as readonly string[]).includes(user.role)) {
      const req = context.switchToHttp().getRequest();
      const area = areaForRoute(String(req.originalUrl || req.url || ''));
      const superAdminOnly = requiredRoles.every((r) => r === UserRole.SUPER_ADMIN);
      if (area && !superAdminOnly) {
        const grants = user.grants ?? effectiveGrants(user.role, null);
        const level = levelForMethod(String(req.method || 'GET'));
        if (!grantAllows(grants, area, level)) {
          throw new ForbiddenException(
            `Your account has no ${level === 'view' ? 'view' : 'edit'} access to this area.`,
          );
        }
        return true;
      }
    }

    const userRoleLevel = ROLE_HIERARCHY[user.role] ?? 0;
    const hasRole = requiredRoles.some(
      (role) => user.role === role || userRoleLevel >= (ROLE_HIERARCHY[role] ?? 999),
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `Requires one of: ${requiredRoles.join(', ')}. Your role: ${user.role}`,
      );
    }

    return true;
  }
}
