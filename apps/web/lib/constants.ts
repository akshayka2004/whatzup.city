/**
 * Application constants and configuration
 */

// API
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
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

// Navigation items
export const PUBLIC_NAV_ITEMS = [
  { label: 'Browse', href: '/category', icon: 'Grid' },
  { label: 'Nearby', href: '/nearby', icon: 'MapPin' },
  { label: 'Search', href: '/search', icon: 'Search' },
  { label: 'Offers', href: '/offers', icon: 'Ticket' },
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
