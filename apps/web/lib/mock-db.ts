/**
 * mock-db.ts — Single source of truth for all localStorage mock data.
 *
 * Seed layout (all passwords: password123):
 *   user@platform.com        → USER
 *   business@platform.com    → BUSINESS_OWNER  (Sunrise Café, mock-biz-001)
 *   moderator@platform.com   → BUSINESS_MODERATOR (same company)
 *   admin@platform.com       → MASTER_ADMIN
 *   superadmin@platform.com  → SUPER_ADMIN
 *   government@platform.com  → GOVERNMENT_ADMIN
 *
 * Keys used:
 *   mock_db_version          → string, bump to force re-seed
 *   mock_db_users            → MockUser[]
 *   mock_db_businesses       → MockBusiness[]
 *   mock_db_team             → MockTeamMember[]
 *   pending_verifications    → PendingVerification[]
 *   submitted_bills          → SubmittedBill[]
 */

export const DB_VERSION = '4'; // bump to wipe + re-seed

// ── Types ────────────────────────────────────────────────────────────────

export interface MockUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  password: string; // plaintext for mock only
  role: 'user' | 'business' | 'admin' | 'super-admin' | 'government';
  rbacRole: 'USER' | 'BUSINESS_OWNER' | 'BUSINESS_MODERATOR' | 'MASTER_ADMIN' | 'SUPER_ADMIN' | 'GOVERNMENT_ADMIN';
  businessId?: string;
  entity?: { id: string; type: string; status: string; name: string } | null;
  createdAt: string;
}

export interface MockBusiness {
  id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website?: string;
  category: string;
  status: 'DRAFT' | 'PENDING_VERIFICATION' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';
  ownerId: string;
  ownerName: string;
  createdAt: string;
  approvedAt?: string;
}

export interface MockTeamMember {
  id: string;
  userId: string;
  businessId: string;
  name: string;
  email: string;
  role: 'BUSINESS_OWNER' | 'BUSINESS_MODERATOR' | 'BUSINESS_ADMIN';
  status: 'ACTIVE' | 'INVITED' | 'INACTIVE';
  joinedAt: string;
}

export interface PendingVerification {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt?: string;
  rejectionReason?: string;
  approvalNotes?: string;
  entity: {
    id: string;
    name: string;
    type: 'BUSINESS' | 'GOVERNMENT' | 'INFLUENCER' | 'PROFESSIONAL' | 'ORGANIZATION' | 'EVENT_ORGANIZER';
    email: string;
    phone: string;
    user: { id: string; name: string; email: string };
    documents: any[];
    business?: any;
  };
}

// ── Seed Data ─────────────────────────────────────────────────────────────

const SEED_USERS: MockUser[] = [
  {
    id: 'mock-user-1',
    email: 'user@platform.com',
    name: 'Alex Customer',
    phone: '9876543210',
    password: 'password123',
    role: 'user',
    rbacRole: 'USER',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mock-biz-owner-1',
    email: 'business@platform.com',
    name: 'John Business',
    phone: '9876500001',
    password: 'password123',
    role: 'business',
    rbacRole: 'BUSINESS_OWNER',
    businessId: 'mock-biz-001',
    entity: { id: 'mock-biz-001', type: 'BUSINESS', status: 'ACTIVE', name: 'Sunrise Café' },
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mock-biz-mod-1',
    email: 'moderator@platform.com',
    name: 'Sam Moderator',
    phone: '9876500002',
    password: 'password123',
    role: 'business',
    rbacRole: 'BUSINESS_MODERATOR',
    businessId: 'mock-biz-001',
    entity: { id: 'mock-biz-001', type: 'BUSINESS', status: 'ACTIVE', name: 'Sunrise Café' },
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mock-admin-1',
    email: 'admin@platform.com',
    name: 'Rita Admin',
    phone: '9876500003',
    password: 'password123',
    role: 'admin',
    rbacRole: 'MASTER_ADMIN',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mock-super-1',
    email: 'superadmin@platform.com',
    name: 'Dev Super',
    phone: '9876500004',
    password: 'password123',
    role: 'super-admin',
    rbacRole: 'SUPER_ADMIN',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mock-gov-1',
    email: 'government@platform.com',
    name: 'Gov Officer',
    phone: '9876500005',
    password: 'password123',
    role: 'government',
    rbacRole: 'GOVERNMENT_ADMIN',
    createdAt: '2024-01-01T00:00:00Z',
  },
];

const SEED_BUSINESSES: MockBusiness[] = [
  {
    id: 'mock-biz-001',
    name: 'Sunrise Café',
    slug: 'sunrise-cafe',
    description: 'Premium coffee and brunch destination in the heart of the city.',
    address: '12 Brigade Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    zipCode: '560001',
    phone: '+91 98765 00001',
    email: 'hello@sunrisecafe.in',
    website: 'sunrisecafe.in',
    category: 'Food & Restaurants',
    status: 'ACTIVE',
    ownerId: 'mock-biz-owner-1',
    ownerName: 'John Business',
    createdAt: '2024-01-01T00:00:00Z',
    approvedAt: '2024-01-02T00:00:00Z',
  },
];

const SEED_TEAM: MockTeamMember[] = [
  {
    id: 'team-1',
    userId: 'mock-biz-owner-1',
    businessId: 'mock-biz-001',
    name: 'John Business',
    email: 'business@platform.com',
    role: 'BUSINESS_OWNER',
    status: 'ACTIVE',
    joinedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'team-2',
    userId: 'mock-biz-mod-1',
    businessId: 'mock-biz-001',
    name: 'Sam Moderator',
    email: 'moderator@platform.com',
    role: 'BUSINESS_MODERATOR',
    status: 'ACTIVE',
    joinedAt: '2024-01-01T00:00:00Z',
  },
];

// ── localStorage keys ─────────────────────────────────────────────────────

export const DB_KEYS = {
  version: 'mock_db_version',
  users: 'mock_db_users',
  businesses: 'mock_db_businesses',
  team: 'mock_db_team',
  pendingVerifications: 'pending_verifications',
  submittedBills: 'submitted_bills',
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────

function ls<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}

function lsSet(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Init / Seed ───────────────────────────────────────────────────────────

/**
 * Call once at app boot (e.g. in AuthProvider useEffect).
 * If DB_VERSION changed, wipes all mock keys and re-seeds.
 */
export function initMockDb() {
  if (typeof window === 'undefined') return;
  const current = localStorage.getItem(DB_KEYS.version);
  if (current === DB_VERSION) return; // already seeded at this version

  // Wipe all mock-db keys
  Object.values(DB_KEYS).forEach((k) => localStorage.removeItem(k));
  // Wipe all legacy / scattered keys used across pages
  const LEGACY_KEYS = [
    'user_session', 'user', 'accessToken', 'refreshToken',
    'converted_sales_count', 'subscription_requests',
    'support_tickets', 'business_tickets', 'issue_reports',
    'submitted_bills', 'claimed_offers', 'saved_businesses',
    'reg_password', 'branches_data', 'business_profile_settings',
    'business_social_links',
  ];
  LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  // Wipe any onboarding drafts (pattern: onboarding_draft_* and entity_onboarding_draft_*)
  Object.keys(localStorage)
    .filter((k) => k.startsWith('onboarding_draft_') || k.startsWith('entity_onboarding_draft_'))
    .forEach((k) => localStorage.removeItem(k));

  // Seed
  lsSet(DB_KEYS.users, SEED_USERS);
  lsSet(DB_KEYS.businesses, SEED_BUSINESSES);
  lsSet(DB_KEYS.team, SEED_TEAM);
  lsSet(DB_KEYS.pendingVerifications, []);
  lsSet(DB_KEYS.submittedBills, []);
  lsSet(DB_KEYS.version, DB_VERSION);
}

// ── User CRUD ─────────────────────────────────────────────────────────────

export function getUsers(): MockUser[] {
  return ls<MockUser[]>(DB_KEYS.users, SEED_USERS);
}

export function getUserByEmail(email: string): MockUser | null {
  return getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function getUserById(id: string): MockUser | null {
  return getUsers().find((u) => u.id === id) ?? null;
}

export function addUser(user: MockUser) {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  lsSet(DB_KEYS.users, users);
}

export function updateUser(id: string, patch: Partial<MockUser>) {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx >= 0) { users[idx] = { ...users[idx], ...patch }; lsSet(DB_KEYS.users, users); }
}

// ── Business CRUD ─────────────────────────────────────────────────────────

export function getBusinesses(): MockBusiness[] {
  return ls<MockBusiness[]>(DB_KEYS.businesses, SEED_BUSINESSES);
}

export function getBusinessById(id: string): MockBusiness | null {
  return getBusinesses().find((b) => b.id === id) ?? null;
}

export function addBusiness(biz: MockBusiness) {
  const businesses = getBusinesses();
  const idx = businesses.findIndex((b) => b.id === biz.id);
  if (idx >= 0) businesses[idx] = biz;
  else businesses.push(biz);
  lsSet(DB_KEYS.businesses, businesses);
}

export function updateBusiness(id: string, patch: Partial<MockBusiness>) {
  const businesses = getBusinesses();
  const idx = businesses.findIndex((b) => b.id === id);
  if (idx >= 0) { businesses[idx] = { ...businesses[idx], ...patch }; lsSet(DB_KEYS.businesses, businesses); }
}

// ── Team CRUD ─────────────────────────────────────────────────────────────

export function getTeamForBusiness(businessId: string): MockTeamMember[] {
  return ls<MockTeamMember[]>(DB_KEYS.team, SEED_TEAM).filter((t) => t.businessId === businessId);
}

export function addTeamMember(member: MockTeamMember) {
  const team = ls<MockTeamMember[]>(DB_KEYS.team, SEED_TEAM);
  team.push(member);
  lsSet(DB_KEYS.team, team);
}

// ── Verification CRUD ─────────────────────────────────────────────────────

export function getPendingVerifications(): PendingVerification[] {
  return ls<PendingVerification[]>(DB_KEYS.pendingVerifications, []);
}

export function addPendingVerification(v: PendingVerification) {
  const list = getPendingVerifications();
  const idx = list.findIndex((x) => x.id === v.id);
  if (idx >= 0) list[idx] = v;
  else list.unshift(v);
  lsSet(DB_KEYS.pendingVerifications, list);
}

export function updateVerification(id: string, patch: Partial<PendingVerification>) {
  const list = getPendingVerifications();
  const idx = list.findIndex((x) => x.id === id);
  if (idx >= 0) { list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() }; lsSet(DB_KEYS.pendingVerifications, list); }
}
