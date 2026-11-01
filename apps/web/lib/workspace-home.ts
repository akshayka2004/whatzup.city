type HomeUser = { role?: string; rbacRole?: string } | null | undefined;

const CIVIC_ROLES = ['NGO_ADMIN', 'COMMUNITY_ADMIN', 'NEWS_FORUM_ADMIN'];

const BUSINESS_ROLES = [
  'BUSINESS_OWNER',
  'BUSINESS_ADMIN',
  'BUSINESS_MODERATOR',
  'BUSINESS_STAFF',
  'INFLUENCER',
  'PROFESSIONAL',
  'EVENT_ORGANIZER',
  'ORGANIZATION_ADMIN',
];

const BUSINESS_LEGACY_ROLES = [
  'business',
  'business_moderator',
  'business_staff',
  'influencer',
  'professional',
  'event-organizer',
  'event_organizer',
  'organization',
  'organization_admin',
];

/**
 * The home screen of the workspace a signed-in person works in: super admin, admin, staff,
 * government, civic or business. Customers (and signed-out visitors) get the public site.
 * Used by the logo, so a click never drops an admin or business owner into the customer layout.
 */
export function workspaceHome(u: HomeUser): string {
  if (!u) return '/';
  const role = u.role ?? '';
  const rbac = u.rbacRole ?? '';
  if (role === 'super-admin' || rbac === 'SUPER_ADMIN') return '/super-admin';
  if (role === 'admin' || rbac === 'MASTER_ADMIN') return '/admin';
  if (role === 'government' || rbac === 'GOVERNMENT_ADMIN') return '/government/dashboard';
  if (role === 'platform_staff' || rbac === 'PLATFORM_STAFF') return '/staff';
  if (role === 'civic' || CIVIC_ROLES.includes(rbac)) return '/civic/dashboard';
  if (BUSINESS_LEGACY_ROLES.includes(role) || BUSINESS_ROLES.includes(rbac)) return '/dashboard';
  return '/';
}
