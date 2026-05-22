import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRoleEnum } from '@prisma/client';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User session not found');
    }

    // Bypass check for platforms admins (Master & Super Admins)
    const platformAdmins: UserRoleEnum[] = [UserRoleEnum.SUPER_ADMIN, UserRoleEnum.MASTER_ADMIN];
    const isPlatformAdmin = platformAdmins.includes(user.role as UserRoleEnum);
    if (isPlatformAdmin) {
      return true;
    }

    // Extract tenantId from route parameters, query string, or body
    const routeTenantId = request.params?.tenantId || request.params?.tenant_id;
    const queryTenantId = request.query?.tenantId || request.query?.tenant_id;
    const bodyTenantId = request.body?.tenantId || request.body?.tenant_id;

    const requestedTenantId = routeTenantId || queryTenantId || bodyTenantId;

    // If no tenant is explicitly targeted, ensure the request has the user's tenant context injected
    if (!requestedTenantId) {
      // Inject user's tenantId into request context to guarantee isolation
      request.tenantId = user.tenantId;
      return true;
    }

    // Validate that the user's tenant matches the requested tenant
    if (user.tenantId !== requestedTenantId) {
      throw new ForbiddenException('Access denied: cross-tenant access is prohibited');
    }

    request.tenantId = user.tenantId;
    return true;
  }
}
