// ============================================================
// Shared Enums — Platform-wide Role & Status Definitions
// ============================================================

export enum UserRole {
  USER = 'USER',
  BUSINESS_OWNER = 'BUSINESS_OWNER',
  BUSINESS_MODERATOR = 'BUSINESS_MODERATOR',
  BUSINESS_STAFF = 'BUSINESS_STAFF',
  GOVERNMENT_ADMIN = 'GOVERNMENT_ADMIN',
  MASTER_ADMIN = 'MASTER_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  INFLUENCER = 'INFLUENCER',
  PROFESSIONAL = 'PROFESSIONAL',
  EVENT_ORGANIZER = 'EVENT_ORGANIZER',
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN',
  // Civic registration roles
  NGO_ADMIN = 'NGO_ADMIN',
  COMMUNITY_ADMIN = 'COMMUNITY_ADMIN',
  NEWS_FORUM_ADMIN = 'NEWS_FORUM_ADMIN',
  // Legacy alias — kept for DB migration compatibility
  BUSINESS_ADMIN = 'BUSINESS_ADMIN',
}

export enum EntityType {
  CUSTOMER = 'CUSTOMER',
  BUSINESS = 'BUSINESS',
  INFLUENCER = 'INFLUENCER',
  PROFESSIONAL = 'PROFESSIONAL',
  EVENT_ORGANIZER = 'EVENT_ORGANIZER',
  ORGANIZATION = 'ORGANIZATION',
  GOVERNMENT = 'GOVERNMENT',
  NGO = 'NGO',
  COMMUNITY = 'COMMUNITY',
  NEWS_FORUM = 'NEWS_FORUM',
}

export enum EntityStatus {
  DRAFT = 'DRAFT',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export enum BusinessStatus {
  DRAFT = 'DRAFT',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED',
}

export enum CustomerStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum BusinessProfileType {
  OWNER = 'OWNER',
  AGENCY = 'AGENCY',
  STAFF = 'STAFF',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum PaymentMethod {
  GPAY = 'GPAY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  RAZORPAY = 'RAZORPAY',
  CASH = 'CASH',
}

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  FLAGGED = 'FLAGGED',
  REMOVED = 'REMOVED',
}

export enum BillStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  RE_UPLOAD_REQUESTED = 'RE_UPLOAD_REQUESTED',
}

export enum OfferStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  EXPIRED = 'EXPIRED',
  ARCHIVED = 'ARCHIVED',
}

export enum NotificationType {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
}

export enum NotificationChannel {
  SYSTEM = 'SYSTEM',
  BUSINESS = 'BUSINESS',
  GOVERNMENT = 'GOVERNMENT',
  ADMIN = 'ADMIN',
}

export enum ReportType {
  SPAM = 'SPAM',
  INAPPROPRIATE = 'INAPPROPRIATE',
  FRAUD = 'FRAUD',
  SAFETY = 'SAFETY',
  OTHER = 'OTHER',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  SUSPEND = 'SUSPEND',
  RESTORE = 'RESTORE',
  UPLOAD = 'UPLOAD',
  VERIFY = 'VERIFY',
}

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
}

// ── BUSINESS MEMBER ROLES ────────────────────────────────────

export enum BusinessMemberRole {
  OWNER = 'OWNER',
  MODERATOR = 'MODERATOR',
  STAFF = 'STAFF',
}

// ── BILL VERIFICATION STATUS ─────────────────────────────────

export enum BillVerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FLAGGED = 'FLAGGED',
  RE_UPLOAD_REQUESTED = 'RE_UPLOAD_REQUESTED',
  ESCALATED = 'ESCALATED',
}

// ── SCOPED FEATURE PERMISSIONS ───────────────────────────────
// Used for client-side RBAC checks and seed data

export type ScopedPermission =
  | 'business.analytics.view'
  | 'business.bills.verify'
  | 'business.bills.override'
  | 'business.team.manage'
  | 'business.subscription.manage'
  | 'business.reviews.moderate'
  | 'business.offers.manage'
  | 'business.customers.view'
  | 'business.reports.export'
  | 'business.media.upload'
  | 'business.listings.manage'
  | 'business.campaigns.manage'
  | 'business.fraud.escalate'
  | 'admin.businesses.approve'
  | 'admin.content.moderate'
  | 'admin.fraud.monitor'
  | 'platform.tenants.manage'
  | 'platform.plans.manage';

// ── FRAUD ESCALATION LEVEL ───────────────────────────────────

export enum FraudEscalationLevel {
  NONE = 'NONE',
  BUSINESS = 'BUSINESS',   // Escalated to BUSINESS_OWNER
  PLATFORM = 'PLATFORM',   // Escalated to MASTER_ADMIN
}
