import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UserRoleEnum } from '@prisma/client';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Platform administrators (Super & Master Admins) automatically bypass permissions
    const platformAdmins: UserRoleEnum[] = [UserRoleEnum.SUPER_ADMIN, UserRoleEnum.MASTER_ADMIN];
    const isPlatformAdmin = platformAdmins.includes(user.role as UserRoleEnum);
    if (isPlatformAdmin) {
      return true;
    }

    const userPermissions: string[] = user.permissions || [];
    const hasPermission = requiredPermissions.every((perm) => userPermissions.includes(perm));

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied: requires permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
