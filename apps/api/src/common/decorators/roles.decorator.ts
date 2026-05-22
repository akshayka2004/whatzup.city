// ============================================================
// Roles Decorator — Attach required roles to route handlers
// ============================================================

import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@saas/types';

export const ROLES_KEY = 'roles';

/**
 * Require specific roles to access a route
 * @example @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
