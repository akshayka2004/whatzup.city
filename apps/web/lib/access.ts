import {
  effectiveGrants,
  FULL_ACCESS,
  grantAllows,
  type AccessAreaKey,
  type AccessGrants,
  type AccessLevel,
} from '@saas/types';

type AccessUser = { role?: string; rbacRole?: string; grants?: AccessGrants } | null | undefined;

/**
 * Which area of the admin portal a page belongs to. Pages not listed (dashboard, profile,
 * settings) belong to no area and stay open to anyone who can reach the portal.
 */
const PATH_AREAS: [RegExp, AccessAreaKey][] = [
  [/^\/admin\/approvals/, 'approvals'],
  [/^\/admin\/registrations/, 'registrations'],
  [/^\/admin\/categories/, 'categories'],
  [/^\/admin\/platform-offers/, 'platform_offers'],
  [/^\/admin\/discounts/, 'spin_wheels'],
  [/^\/admin\/notices/, 'notices'],
  [/^\/admin\/(reports|moderation|fraud|fraud-escalations)/, 'reports'],
  [/^\/admin\/bills/, 'bills'],
  [/^\/admin\/support/, 'support'],
  [/^\/admin\/audit/, 'audit'],
  [/^\/admin\/(payments|payment-approvals|subscriptions)/, 'payments'],
  [/^\/staff\/events/, 'events'],
  [/^\/staff\/movies/, 'movies'],
  [/^\/staff\/platform-offers/, 'platform_offers'],
  [/^\/staff\/announcements/, 'notices'],
  [/^\/staff\/businesses/, 'businesses'],
];

export function areaForPath(pathname: string): AccessAreaKey | null {
  for (const [re, area] of PATH_AREAS) if (re.test(pathname)) return area;
  return null;
}

/** What the signed-in account may do. A super admin has everything. */
export function userGrants(user: AccessUser): AccessGrants {
  if (!user) return {};
  if (user.role === 'super-admin' || user.rbacRole === 'SUPER_ADMIN') return FULL_ACCESS;
  return user.grants ?? effectiveGrants(user.rbacRole, null);
}

export function canAccess(user: AccessUser, area: AccessAreaKey, level: AccessLevel = 'view') {
  return grantAllows(userGrants(user), area, level);
}

/** False only when the path belongs to an area this account has no access to. */
export function canOpenPath(user: AccessUser, pathname: string) {
  const area = areaForPath(pathname);
  return !area || canAccess(user, area, 'view');
}

export const isPlatformStaff = (user: AccessUser) =>
  !!user && (user.rbacRole === 'PLATFORM_STAFF' || user.role === 'platform_staff');
