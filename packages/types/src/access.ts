// ============================================================
// Staff access — which parts of the admin portal an account may use
//
// A super admin ticks, per account, an access level for each area. Area keys and the route
// map live here so the API (enforcement) and the web app (navigation, page guards, the staff
// form) can never disagree about what exists.
// ============================================================

export type AccessLevel = 'view' | 'manage';

export interface AccessArea {
  key: string;
  label: string;
  description: string;
  /** Section heading in the staff form. */
  group: 'People' | 'Listings' | 'Content' | 'Money and records' | 'Oversight';
  /** Hidden from forms and navigation while payments are dormant. */
  paymentsOnly?: boolean;
}

export const ACCESS_AREAS = [
  {
    key: 'approvals',
    label: 'Approvals',
    description: 'Review and approve business registrations and their documents.',
    group: 'People',
  },
  {
    key: 'registrations',
    label: 'Registrations',
    description: 'Sign-ups, launch interest and the user list.',
    group: 'People',
  },
  {
    key: 'businesses',
    label: 'Businesses',
    description: 'Business and brand listings.',
    group: 'People',
  },
  {
    key: 'categories',
    label: 'Categories',
    description: 'Business categories and subcategories.',
    group: 'Listings',
  },
  {
    key: 'platform_offers',
    label: 'Platform offers',
    description: 'Offers and vouchers published by the platform.',
    group: 'Listings',
  },
  {
    key: 'spin_wheels',
    label: 'Spin wheels',
    description: 'Discount and lucky-wheel campaigns.',
    group: 'Listings',
  },
  {
    key: 'events',
    label: 'Events',
    description: 'City events.',
    group: 'Content',
  },
  {
    key: 'movies',
    label: 'Movies',
    description: 'Movie listings.',
    group: 'Content',
  },
  {
    key: 'notices',
    label: 'Notices',
    description: 'Announcements and government alerts.',
    group: 'Content',
  },
  {
    key: 'bills',
    label: 'Bills',
    description: 'Customer bill checks and escalations.',
    group: 'Money and records',
  },
  {
    key: 'payments',
    label: 'Payments',
    description: 'Payments, plans and subscriptions.',
    group: 'Money and records',
    paymentsOnly: true,
  },
  {
    key: 'analytics',
    label: 'Analytics',
    description: 'Platform and onboarding analytics.',
    group: 'Money and records',
  },
  {
    key: 'reports',
    label: 'Reports and moderation',
    description: 'User reports, reviews and fraud cases.',
    group: 'Oversight',
  },
  {
    key: 'support',
    label: 'Support inbox',
    description: 'Support tickets.',
    group: 'Oversight',
  },
  {
    key: 'audit',
    label: 'Audit logs',
    description: 'Who did what, and when.',
    group: 'Oversight',
  },
] as const satisfies readonly AccessArea[];

export type AccessAreaKey = (typeof ACCESS_AREAS)[number]['key'];

/** What an account may do, per area. A missing area means no access. */
export type AccessGrants = Partial<Record<AccessAreaKey, AccessLevel>>;

const AREA_KEYS = new Set<string>(ACCESS_AREAS.map((a) => a.key));
export const isAccessArea = (key: string): key is AccessAreaKey => AREA_KEYS.has(key);

export const FULL_ACCESS = Object.fromEntries(
  ACCESS_AREAS.map((a) => [a.key, 'manage' as const]),
) as AccessGrants;

/** What every Platform Staff account could do before per-account access existed. */
export const LEGACY_STAFF_ACCESS: AccessGrants = {
  events: 'manage',
  movies: 'manage',
  platform_offers: 'manage',
  notices: 'manage',
  businesses: 'view',
};

export interface AccessPreset {
  key: string;
  label: string;
  description: string;
  grants: AccessGrants;
}

/** Shortcuts that pre-tick the form. Nothing is stored about the preset itself. */
export const ACCESS_PRESETS: AccessPreset[] = [
  {
    key: 'data_entry',
    label: 'Data entry',
    description: 'Events, movies, platform offers and notices. Businesses read-only.',
    grants: LEGACY_STAFF_ACCESS,
  },
  {
    key: 'approver',
    label: 'Approver',
    description: 'Approves businesses and checks bills.',
    grants: {
      approvals: 'manage',
      bills: 'manage',
      registrations: 'view',
      businesses: 'view',
      categories: 'view',
    },
  },
  {
    key: 'support_agent',
    label: 'Support agent',
    description: 'Answers support tickets and looks things up.',
    grants: { support: 'manage', reports: 'view', businesses: 'view', registrations: 'view' },
  },
  {
    key: 'moderator',
    label: 'Moderator',
    description: 'Handles reports, reviews and fraud cases.',
    grants: { reports: 'manage', support: 'view', businesses: 'view', audit: 'view' },
  },
  {
    key: 'viewer',
    label: 'Read-only',
    description: 'Can look at every area, change nothing.',
    grants: Object.fromEntries(ACCESS_AREAS.map((a) => [a.key, 'view' as const])) as AccessGrants,
  },
  {
    key: 'full',
    label: 'Everything',
    description: 'Manage every area (same as a Portal Admin today).',
    grants: FULL_ACCESS,
  },
];

/** Keeps only known areas with a valid level. Anything else is dropped, never stored. */
export function normalizeGrants(input: unknown): AccessGrants {
  const out: AccessGrants = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  for (const [key, level] of Object.entries(input as Record<string, unknown>)) {
    if (isAccessArea(key) && (level === 'view' || level === 'manage')) out[key] = level;
  }
  return out;
}

/**
 * The access an account really has. Accounts saved before this feature carry no grants and keep
 * what their role used to give; a super admin always has everything.
 */
export function effectiveGrants(role: string | undefined, stored: unknown): AccessGrants {
  if (role === 'SUPER_ADMIN') return FULL_ACCESS;
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) return normalizeGrants(stored);
  if (role === 'MASTER_ADMIN') return FULL_ACCESS;
  if (role === 'PLATFORM_STAFF') return LEGACY_STAFF_ACCESS;
  return {};
}

export function grantAllows(
  grants: AccessGrants | undefined | null,
  area: AccessAreaKey,
  level: AccessLevel,
): boolean {
  const have = grants?.[area];
  return have === 'manage' || (have === 'view' && level === 'view');
}

/**
 * Which area an API route belongs to, from its path after "/v1/" (no query string). First match
 * wins, so put the narrow rules first. A route with no area is not grantable: it keeps the plain
 * role check.
 */
const ROUTE_AREAS: [RegExp, AccessAreaKey][] = [
  [/^businesses\/(documents|[^/]+\/documents)(\/|$)/, 'approvals'],
  [/^admin\/businesses(\/|$)/, 'approvals'],
  [/^verification(\/|$)/, 'approvals'],
  [/^users\/admin\/all-registrations(\/|$)/, 'registrations'],
  [/^launch-interests(\/|$)/, 'registrations'],
  [/^admin\/bill-verifications(\/|$)/, 'bills'],
  [/^bill-verifications(\/|$)/, 'bills'],
  [/^admin\/onboarding(\/|$)/, 'analytics'],
  [/^(analytics|search-analytics|segmentation|business-intelligence)(\/|$)/, 'analytics'],
  [/^(businesses|brands)(\/|$)/, 'businesses'],
  [/^categories(\/|$)/, 'categories'],
  [/^(platform-offers|platform-vouchers)(\/|$)/, 'platform_offers'],
  [/^discounts(\/|$)/, 'spin_wheels'],
  [/^events(\/|$)/, 'events'],
  [/^movies(\/|$)/, 'movies'],
  [/^(announcements|government-alerts)(\/|$)/, 'notices'],
  [/^(payments|subscriptions|trials)(\/|$)/, 'payments'],
  [/^(reports|reviews)(\/|$)/, 'reports'],
  [/^support(\/|$)/, 'support'],
  [/^audit-logs(\/|$)/, 'audit'],
];

export function areaForRoute(path: string): AccessAreaKey | null {
  const clean = path.split('?')[0].replace(/^\/+/, '');
  const afterVersion = clean.includes('v1/') ? clean.slice(clean.indexOf('v1/') + 3) : clean;
  for (const [re, area] of ROUTE_AREAS) if (re.test(afterVersion)) return area;
  return null;
}

/** Reading is "view"; anything that changes data is "manage". */
export function levelForMethod(method: string): AccessLevel {
  return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase()) ? 'view' : 'manage';
}

/** Roles whose reach is decided by grants rather than by role alone. */
export const GRANT_ROLES = ['MASTER_ADMIN', 'PLATFORM_STAFF'] as const;
