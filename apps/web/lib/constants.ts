/**
 * Application constants and configuration
 */

// API — Always same-origin via Next.js /api proxy rewrite (bare-metal HTTP requirement)
export const API_BASE_URL = '/api';
export const API_TIMEOUT = 30000; // 30 seconds

// User roles
export const USER_ROLES = {
  PUBLIC: 'user',
  BUSINESS: 'business',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super-admin',
} as const;

// Business categories
export const BUSINESS_CATEGORIES = [
  'Restaurants',
  'Shopping',
  'Services',
  'Entertainment',
  'Healthcare',
  'Education',
  'Travel',
  'Technology',
  'Finance',
  'Real Estate',
] as const;

// Serviceable cities (Kerala). Single source used by registration, filters,
// and city-targeting for offers/announcements/events.
export const KERALA_CITIES = [
  'Thiruvananthapuram',
  'Kochi',
  'Kozhikode',
  'Kollam',
  'Thrissur',
  'Kannur',
  'Palakkad',
  'Alappuzha',
  'Kottayam',
  'Thalassery',
  'Payyannur',
  'Malappuram',
  'Guruvayoor',
  'Irinjalakkuda',
  'Ottappalam',
  'Thiruvalla',
  'Thodupuzha',
  'Ettumanoor',
  'Chalakkudy',
  'Changanacherry',
  'Punalur',
  'Sulthan Bathery',
  'Kattappana',
  'Varkala',
  'Kothamangalam',
  'Angamali',
  'Kalpetta',
  'Adoor',
  'Chengannur',
  'Aluva',
  'Pala',
] as const;

export type KeralaCity = (typeof KERALA_CITIES)[number];

// Professions offered on the user profile + super-admin user editor.
export const PROFESSIONS = [
  'Student',
  'IT / Software (Techie)',
  'Doctor / Healthcare',
  'Teacher / Educator',
  'Engineer',
  'Business Owner',
  'Government Employee',
  'Lawyer',
  'Accountant / Finance',
  'Artist / Creator',
  'Homemaker',
  'Retired',
  'Other',
] as const;

// Assignable roles in the super-admin user editor (label + enum value).
export const USER_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'USER', label: 'Public User' },
  { value: 'BUSINESS_OWNER', label: 'Business Owner' },
  { value: 'BUSINESS_MODERATOR', label: 'Business Moderator' },
  { value: 'BUSINESS_STAFF', label: 'Business Staff' },
  { value: 'INFLUENCER', label: 'Influencer / Content Creator' },
  { value: 'PROFESSIONAL', label: 'Professional' },
  { value: 'EVENT_ORGANIZER', label: 'Event Organizer' },
  { value: 'GOVERNMENT_ADMIN', label: 'Government Admin' },
  { value: 'NGO_ADMIN', label: 'NGO Admin' },
  { value: 'COMMUNITY_ADMIN', label: 'Community Admin' },
  { value: 'NEWS_FORUM_ADMIN', label: 'News Forum Admin' },
  { value: 'MASTER_ADMIN', label: 'Master Admin' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
];

// Viewer's chosen city — persisted so the public offers/events/announcements
// feeds stay filtered to one location as the visitor navigates. Empty = all.
export const VIEWER_CITY_KEY = 'viewer_city';

export function getViewerCity(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(VIEWER_CITY_KEY) || '';
  } catch {
    return '';
  }
}

export function setViewerCity(city: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (city) localStorage.setItem(VIEWER_CITY_KEY, city);
    else localStorage.removeItem(VIEWER_CITY_KEY);
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

// Navigation items
export const PUBLIC_NAV_ITEMS = [
  { label: 'Browse', href: '/category', icon: 'Grid' },
  { label: 'Nearby', href: '/nearby', icon: 'MapPin' },
  { label: 'Search', href: '/search', icon: 'Search' },
  { label: 'Offers', href: '/offers', icon: 'Ticket' },
  { label: 'Events', href: '/events', icon: 'Calendar' },
  { label: 'Announcements', href: '/government', icon: 'FileText' },
  { label: 'Favorites', href: '/favorites', icon: 'Heart' },
  { label: 'Notifications', href: '/notifications', icon: 'Bell' },
];

// Pagination
export const ITEMS_PER_PAGE = 20;
export const MAX_ITEMS_PER_PAGE = 100;

// File upload
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword'];

// Validation
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 50;

// Time units
export const MILLISECONDS_PER_SECOND = 1000;
export const MILLISECONDS_PER_MINUTE = 60 * MILLISECONDS_PER_SECOND;
export const MILLISECONDS_PER_HOUR = 60 * MILLISECONDS_PER_MINUTE;
export const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;

// Rating
export const MIN_RATING = 1;
export const MAX_RATING = 5;
export const RATING_SCALE = [1, 2, 3, 4, 5] as const;

// HTTP Status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;
