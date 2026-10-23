// ============================================================
// Role Guard — RBAC enforcement with role hierarchy
// ============================================================

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '@saas/types';
import { twoFactorRequiredFor } from '../utils/two-factor-policy';

// Roles only outrank each other within their own ladder. The old single
// hierarchy let self-registered government, civic and specialty accounts
// (levels 4-5) pass every BUSINESS_OWNER / MODERATOR / STAFF route.
const BUSINESS_LADDER: Record<string, number> = {
  [UserRole.BUSINESS_STAFF]: 2,
  [UserRole.BUSINESS_MODERATOR]: 3,
  [UserRole.BUSINESS_OWNER]: 4,
  // Legacy alias kept for backward compatibility
  [UserRole.BUSINESS_ADMIN]: 4,
};
const PLATFORM_LADDER: Record<string, number> = {
  [UserRole.MASTER_ADMIN]: 6,
  [UserRole.SUPER_ADMIN]: 7,
};

/** Whether a user with `have` satisfies a route that lists `need`. */
export function roleSatisfies(have: string, need: string): boolean {
  if (have === need) return true;
  // USER means "any signed-in account".
  if (need === UserRole.USER) return true;
  const havePlatform = PLATFORM_LADDER[have];
  if (havePlatform) {
    const needPlatform = PLATFORM_LADDER[need];
    // Platform admins pass every non-platform role; between themselves, by rank.
    return needPlatform ? havePlatform >= needPlatform : true;
  }
  const haveBiz = BUSINESS_LADDER[have];
  const needBiz = BUSINESS_LADDER[need];
  return !!haveBiz && !!needBiz && haveBiz >= needBiz;
}

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

    const hasRole = requiredRoles.some((role) => roleSatisfies(user.role, role));

    if (!hasRole) {
      throw new ForbiddenException(
        `Requires one of: ${requiredRoles.join(', ')}. Your role: ${user.role}`,
      );
    }

    // Role-gated routes are where admin power lives; enrolment is enforced here
    // (the 2FA setup endpoints themselves only need a signed-in user).
    if (twoFactorRequiredFor(user.role) && !user.twoFactorEnabled) {
      throw new ForbiddenException({
        message: 'Turn on two-factor sign-in to use admin tools.',
        code: 'TWO_FACTOR_SETUP_REQUIRED',
      });
    }

    return true;
  }
}
