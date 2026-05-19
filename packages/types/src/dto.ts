// ============================================================
// Shared DTOs — Request/Response contracts used across layers
// ============================================================

import {
  UserRole,
  BusinessStatus,
  OfferStatus,
  BillStatus,
  ReviewStatus,
  ReportStatus,
  ReportType,
} from './enums';

// ── Pagination ──────────────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ── Auth ────────────────────────────────────────────────────

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: UserRole;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserDto;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

// ── User ────────────────────────────────────────────────────

export interface UserDto {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatar: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserDto {
  name?: string;
  phone?: string;
  avatar?: string;
}

// ── Business ────────────────────────────────────────────────

export interface CreateBusinessDto {
  name: string;
  description: string;
  categoryId: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  phone: string;
  email: string;
  website?: string;
  operatingHours?: Record<string, { open: string; close: string }>;
}

export interface BusinessDto {
  id: string;
  tenantId: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  status: BusinessStatus;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  email: string;
  website: string | null;
  logo: string | null;
  coverImage: string | null;
  operatingHours: Record<string, { open: string; close: string }> | null;
  averageRating: number;
  totalReviews: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBusinessDto extends Partial<CreateBusinessDto> {
  status?: BusinessStatus;
}

// ── Product ─────────────────────────────────────────────────

export interface CreateProductDto {
  name: string;
  description: string;
  price: number;
  categoryId?: string;
  images?: string[];
  isAvailable?: boolean;
}

export interface ProductDto {
  id: string;
  businessId: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Offer ───────────────────────────────────────────────────

export interface CreateOfferDto {
  title: string;
  description: string;
  discountPercent?: number;
  discountAmount?: number;
  code?: string;
  startDate: string;
  endDate: string;
  maxRedemptions?: number;
  terms?: string;
}

export interface OfferDto {
  id: string;
  businessId: string;
  title: string;
  description: string;
  discountPercent: number | null;
  discountAmount: number | null;
  code: string | null;
  status: OfferStatus;
  startDate: string;
  endDate: string;
  maxRedemptions: number | null;
  currentRedemptions: number;
  terms: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Review ──────────────────────────────────────────────────

export interface CreateReviewDto {
  businessId: string;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
}

export interface ReviewDto {
  id: string;
  userId: string;
  businessId: string;
  rating: number;
  title: string | null;
  comment: string;
  images: string[];
  status: ReviewStatus;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
  user?: Pick<UserDto, 'id' | 'name' | 'avatar'>;
}

// ── Bill ────────────────────────────────────────────────────

export interface CreateBillDto {
  businessId: string;
  amount: number;
  billDate: string;
  billImage: string;
  description?: string;
}

export interface BillDto {
  id: string;
  userId: string;
  businessId: string;
  amount: number;
  billDate: string;
  billImage: string;
  status: BillStatus;
  verifiedAt: string | null;
  verifiedBy: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Notification ────────────────────────────────────────────

export interface NotificationDto {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  channel: string;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ── Announcement (Government) ───────────────────────────────

export interface CreateAnnouncementDto {
  title: string;
  body: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  publishAt?: string;
  expiresAt?: string;
  targetAudience?: string[];
}

export interface AnnouncementDto {
  id: string;
  agencyId: string;
  title: string;
  body: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isPublished: boolean;
  publishAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Report ──────────────────────────────────────────────────

export interface CreateReportDto {
  targetType: 'BUSINESS' | 'REVIEW' | 'USER';
  targetId: string;
  type: ReportType;
  description: string;
  evidence?: string[];
}

export interface ReportDto {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  type: ReportType;
  status: ReportStatus;
  description: string;
  evidence: string[];
  resolution: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Audit Log ───────────────────────────────────────────────

export interface AuditLogDto {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// ── Analytics ───────────────────────────────────────────────

export interface AnalyticsOverviewDto {
  totalUsers: number;
  totalBusinesses: number;
  totalReviews: number;
  totalOffers: number;
  activeBusinesses: number;
  pendingApprovals: number;
  revenueThisMonth: number;
  growthRate: number;
}

// ── API Response Wrapper ────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  timestamp: string;
}
