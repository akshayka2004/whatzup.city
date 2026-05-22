// ============================================================
// Client-Side RBAC Utility
// Provides permission checks for UI rendering decisions.
// ============================================================

export const UserRole = {
  USER: 'USER',
  BUSINESS_MODERATOR: 'BUSINESS_MODERATOR',
  BUSINESS_OWNER: 'BUSINESS_OWNER',
  BUSINESS_ADMIN: 'BUSINESS_ADMIN', // Legacy alias for BUSINESS_OWNER
  GOVERNMENT_ADMIN: 'GOVERNMENT_ADMIN',
  MASTER_ADMIN: 'MASTER_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

// ── SCOPED PERMISSION SETS PER ROLE ──────────────────────────────────

const ROLE_PERMISSIONS: Record<string, string[]> = {
  [UserRole.USER]: [
    'offers.claim',
    'bills.submit',
    'reviews.create',
    'favorites.manage',
    'support.create',
    'issues.report',
  ],

  [UserRole.BUSINESS_OWNER]: [
    'business.analytics.view',
    'business.bills.verify',
    'business.bills.override',
    'business.team.manage',
    'business.subscription.manage',
    'business.subscription.request',
    'business.reviews.moderate',
    'business.offers.manage',
    'business.customers.view',
    'business.reports.export',
    'business.media.upload',
    'business.listings.manage',
    'business.campaigns.manage',
    'business.branches.manage',
    'business.support.respond',
    'business.issues.view',
    'business.products.manage',
  ],

  [UserRole.BUSINESS_ADMIN]: [
    // Legacy alias — same as BUSINESS_OWNER
    'business.analytics.view',
    'business.bills.verify',
    'business.bills.override',
    'business.team.manage',
    'business.subscription.manage',
    'business.subscription.request',
    'business.reviews.moderate',
    'business.offers.manage',
    'business.customers.view',
    'business.reports.export',
    'business.media.upload',
    'business.listings.manage',
    'business.campaigns.manage',
    'business.branches.manage',
    'business.support.respond',
    'business.issues.view',
    'business.products.manage',
  ],

  [UserRole.BUSINESS_MODERATOR]: [
    // Branch-scoped only — no global analytics, no financials
    'business.bills.verify',
    'business.reviews.moderate',
    'business.branch.stats',
    'business.issues.view',
    'business.media.upload',
  ],

  [UserRole.GOVERNMENT_ADMIN]: [
    'gov.alerts.manage',
    'gov.announcements.manage',
    'gov.notices.manage',
  ],

  [UserRole.MASTER_ADMIN]: [
    'admin.businesses.approve',
    'admin.content.moderate',
    'admin.reports.review',
    'admin.notices.manage',
    'admin.categories.manage',
    'admin.audit.view',
    'admin.subscriptions.manage',
    'admin.issues.resolve',
    'admin.support.override',
    'business.analytics.view',
  ],

  [UserRole.SUPER_ADMIN]: [
    // All MASTER_ADMIN permissions
    'admin.businesses.approve',
    'admin.content.moderate',
    'admin.reports.review',
    'admin.notices.manage',
    'admin.categories.manage',
    'admin.audit.view',
    'admin.subscriptions.manage',
    'admin.issues.resolve',
    'admin.support.override',
    'business.analytics.view',
    // Plus platform-level
    'platform.tenants.manage',
    'platform.plans.manage',
    'platform.infrastructure.view',
    'platform.security.view',
    'platform.roles.manage',
    'business.bills.verify',
    'business.bills.override',
    'business.subscription.approve',
    'platform.override.all',
  ],
};

// ── ROLE HIERARCHY LEVEL ─────────────────────────────────────────────

const ROLE_LEVEL: Record<string, number> = {
  [UserRole.USER]: 1,
  [UserRole.BUSINESS_MODERATOR]: 2,
  [UserRole.BUSINESS_OWNER]: 3,
  [UserRole.BUSINESS_ADMIN]: 3,
  [UserRole.GOVERNMENT_ADMIN]: 3,
  [UserRole.MASTER_ADMIN]: 5,
  [UserRole.SUPER_ADMIN]: 6,
};

// ── PUBLIC API ────────────────────────────────────────────────────────

export function canAccess(userRole: string, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] ?? [];
  return permissions.includes(permission);
}

export function hasRole(userRole: string, requiredRole: string): boolean {
  const userLevel = ROLE_LEVEL[userRole] ?? 0;
  const requiredLevel = ROLE_LEVEL[requiredRole] ?? 999;
  return userLevel >= requiredLevel;
}

export function isBusinessRole(role: string): boolean {
  return [
    UserRole.BUSINESS_OWNER,
    UserRole.BUSINESS_MODERATOR,
    UserRole.BUSINESS_ADMIN,
  ].includes(role as UserRoleType);
}

export function isPlatformAdmin(role: string): boolean {
  return [UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN].includes(role as UserRoleType);
}

export function getPermissions(role: string): string[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    [UserRole.SUPER_ADMIN]: 'Super Admin',
    [UserRole.MASTER_ADMIN]: 'Master Admin',
    [UserRole.BUSINESS_OWNER]: 'Business Owner',
    [UserRole.BUSINESS_MODERATOR]: 'Moderator',
    [UserRole.BUSINESS_ADMIN]: 'Business Owner',
    [UserRole.GOVERNMENT_ADMIN]: 'Government',
    [UserRole.USER]: 'Customer',
  };
  return labels[role] ?? role;
}
