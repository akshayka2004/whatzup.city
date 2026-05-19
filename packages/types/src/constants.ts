// ============================================================
// Shared Constants — Platform-wide configuration values
// ============================================================

export const PLATFORM = {
  NAME: 'Enterprise SaaS Platform',
  VERSION: '0.1.0',
  DESCRIPTION: 'Business discovery, verified commerce engagement, and civic notifications',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const AUTH = {
  ACCESS_TOKEN_KEY: 'access_token',
  REFRESH_TOKEN_KEY: 'refresh_token',
  USER_SESSION_KEY: 'user_session',
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  SALT_ROUNDS: 12,
} as const;

export const FILE_UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
  MAX_BILL_FILE_SIZE: 5 * 1024 * 1024, // 5 MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
  MAX_IMAGES_PER_REVIEW: 5,
  MAX_IMAGES_PER_PRODUCT: 10,
} as const;

export const RATE_LIMITS = {
  AUTH: { ttl: 60, limit: 10 },
  API_GENERAL: { ttl: 60, limit: 100 },
  FILE_UPLOAD: { ttl: 60, limit: 20 },
  SEARCH: { ttl: 60, limit: 50 },
} as const;

export const CACHE_KEYS = {
  BUSINESS_LIST: 'businesses:list',
  BUSINESS_DETAIL: 'businesses:detail',
  CATEGORIES: 'categories:all',
  OFFERS_ACTIVE: 'offers:active',
  USER_PROFILE: 'user:profile',
  ANALYTICS_OVERVIEW: 'analytics:overview',
} as const;

export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

export const REVIEW = {
  MIN_RATING: 1,
  MAX_RATING: 5,
  MIN_COMMENT_LENGTH: 10,
  MAX_COMMENT_LENGTH: 2000,
} as const;

export const SEARCH = {
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 100,
  DEFAULT_RADIUS_KM: 10,
  MAX_RADIUS_KM: 100,
} as const;
