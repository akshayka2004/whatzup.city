import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, areaForRoute } from '@saas/types';
import { RolesGuard } from './roles.guard';

function ctx(
  user: Record<string, unknown> | null,
  opts: { url: string; method?: string; roles?: UserRole[] },
) {
  const reflector = { getAllAndOverride: jest.fn(() => opts.roles) } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user, originalUrl: opts.url, method: opts.method ?? 'GET' }),
    }),
  } as unknown as ExecutionContext;
  return () => guard.canActivate(context);
}

const ADMIN_ROUTE = [UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN];

describe('RolesGuard with staff grants', () => {
  it('lets a staff member with view access read, not change', () => {
    const user = { role: 'PLATFORM_STAFF', grants: { events: 'view' } };
    expect(ctx(user, { url: '/v1/events', roles: ADMIN_ROUTE })()).toBe(true);
    expect(() => ctx(user, { url: '/v1/events', method: 'POST', roles: ADMIN_ROUTE })()).toThrow(
      ForbiddenException,
    );
  });

  it('lets manage access change data', () => {
    const user = { role: 'PLATFORM_STAFF', grants: { events: 'manage' } };
    expect(ctx(user, { url: '/api/v1/events/123', method: 'PATCH', roles: ADMIN_ROUTE })()).toBe(
      true,
    );
  });

  it('blocks an area the account has no access to, even on a route that lists their role', () => {
    const user = { role: 'PLATFORM_STAFF', grants: { events: 'manage' } };
    const roles = [UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN, UserRole.PLATFORM_STAFF];
    expect(() => ctx(user, { url: '/v1/platform-offers', roles })()).toThrow(ForbiddenException);
  });

  it('opens a route that never listed staff, when the grant covers its area', () => {
    const user = { role: 'PLATFORM_STAFF', grants: { reports: 'manage' } };
    expect(ctx(user, { url: '/v1/reports?x=1', method: 'PATCH', roles: ADMIN_ROUTE })()).toBe(true);
  });

  it('restricts a portal admin the same way', () => {
    const user = { role: 'MASTER_ADMIN', grants: { support: 'view' } };
    expect(ctx(user, { url: '/v1/support/tickets', roles: ADMIN_ROUTE })()).toBe(true);
    expect(() => ctx(user, { url: '/v1/categories', roles: ADMIN_ROUTE })()).toThrow(
      ForbiddenException,
    );
  });

  it('keeps old accounts working: no stored grants means what the role always allowed', () => {
    expect(
      ctx(
        { role: 'MASTER_ADMIN' },
        { url: '/v1/categories', method: 'POST', roles: ADMIN_ROUTE },
      )(),
    ).toBe(true);
    const staff = { role: 'PLATFORM_STAFF' };
    expect(ctx(staff, { url: '/v1/events', method: 'POST', roles: ADMIN_ROUTE })()).toBe(true);
    expect(() => ctx(staff, { url: '/v1/reports', roles: ADMIN_ROUTE })()).toThrow(
      ForbiddenException,
    );
  });

  it('never lets a grant open a super-admin-only route', () => {
    const user = { role: 'MASTER_ADMIN', grants: { registrations: 'manage', approvals: 'manage' } };
    expect(() =>
      ctx(user, { url: '/v1/users/admin/123', method: 'PATCH', roles: [UserRole.SUPER_ADMIN] })(),
    ).toThrow(ForbiddenException);
  });

  it('routes outside any area keep the plain role check', () => {
    const staff = { role: 'PLATFORM_STAFF', grants: { events: 'manage' } };
    expect(() => ctx(staff, { url: '/v1/tenants', roles: ADMIN_ROUTE })()).toThrow(
      ForbiddenException,
    );
    const admin = { role: 'MASTER_ADMIN', grants: {} };
    expect(ctx(admin, { url: '/v1/tenants', roles: ADMIN_ROUTE })()).toBe(true);
  });

  it('does not touch other roles', () => {
    const owner = { role: 'BUSINESS_OWNER' };
    expect(
      ctx(owner, { url: '/v1/businesses/1', method: 'PATCH', roles: [UserRole.BUSINESS_OWNER] })(),
    ).toBe(true);
    expect(() => ctx(owner, { url: '/v1/events', roles: ADMIN_ROUTE })()).toThrow(
      ForbiddenException,
    );
  });
});

describe('areaForRoute', () => {
  it.each([
    ['/v1/events', 'events'],
    ['/api/v1/platform-offers/abc', 'platform_offers'],
    ['/v1/businesses/abc/documents', 'approvals'],
    ['/v1/businesses/documents/pending', 'approvals'],
    ['/v1/businesses/admin', 'businesses'],
    ['/v1/admin/bill-verifications/x', 'bills'],
    ['/v1/admin/onboarding/analytics/funnel', 'analytics'],
    ['/v1/users/admin/all-registrations?page=2', 'registrations'],
    ['/v1/support/tickets/9', 'support'],
    ['/v1/audit-logs', 'audit'],
  ])('%s -> %s', (path, area) => expect(areaForRoute(path)).toBe(area));

  it.each(['/v1/users/me', '/v1/tenants', '/v1/admin/staff', '/v1/auth/login'])(
    '%s has no area',
    (path) => expect(areaForRoute(path)).toBeNull(),
  );
});
