/**
 * AnalyticsService — centralized frontend analytics API layer.
 *
 * ALL dashboard metric fetches must go through this service.
 * No page component may call /v1/analytics/* directly.
 */

import { apiService } from './api-service';

// ── Types ─────────────────────────────────────────────────────────────────

export interface OverviewMetrics {
  totalUsers: number;
  totalBusinesses: number;
  activeBusinesses: number;
  pendingApprovals: number;
  totalReviews: number;
  totalOffers: number;
  totalOfferCustomers: number;
  totalRedemptions: number;
  totalClaims: number;
  totalComplaints: number;
  totalPlatformSpend: number;
  revenueThisMonth: number;
  growthRate: number;
}

export interface BusinessKPIs {
  activeOffers: number;
  totalOffers: number;
  totalRedemptions: number;
  avgRating: number | null;
  totalReviews: number;
  teamCount: number;
  impressions: number;
  customerCount: number;
  totalClaims: number;
  totalCrmRedemptions: number;
  redemptionRate: number;
}

export interface BusinessSummary {
  kpis: BusinessKPIs;
  offerPerformance: Array<{ title: string; redemptions: number; discount: number; status: string }>;
  redemptionTrend: Array<{ date: string; count: number }>;
  ratingDistribution: Array<{ stars: number; count: number }>;
  recentReviews: Array<{ rating: number; title: string | null; comment: string; author: string; createdAt: string }>;
}

export interface TopSpender {
  userId: string;
  totalSpend: number;
  spendLast30Days: number;
  verifiedBillCount: number;
  offersRedeemedCount: number;
  engagementScore: number;
  primarySpendCategory: string | null;
  lastActivityAt: string | null;
  user: { id: string; name: string; email: string } | null;
}

export interface TopReferrer {
  entityId: string;
  entityType: string;
  referralCode: string;
  totalReferrals: number;
  successfulReferrals: number;
  referralConversionRate: number;
  lastReferralAt: string | null;
}

// ── Service ───────────────────────────────────────────────────────────────

class AnalyticsService {
  // ── Admin / Super-admin ──────────────────────────────────────────────────

  /**
   * Platform-wide KPI overview — reads from summary tables + Redis cache.
   * Used by super-admin and admin dashboards.
   */
  async getOverview(): Promise<OverviewMetrics | null> {
    const res = await apiService.get<OverviewMetrics>('/v1/analytics/overview');
    if (res.error || !res.data) return null;
    return res.data;
  }

  /**
   * Detailed audit analytics (payments, redemptions, fraud, engagement trends).
   */
  async getDetailed(): Promise<any | null> {
    const res = await apiService.get<any>('/v1/analytics/detailed');
    if (res.error || !res.data) return null;
    return res.data;
  }

  /**
   * Top spender leaderboard from UserSpendingSummary pre-aggregated table.
   */
  async getTopSpenders(limit = 10): Promise<TopSpender[]> {
    const res = await apiService.get<TopSpender[]>(`/v1/analytics/top-spenders?limit=${limit}`);
    return res.data ?? [];
  }

  /**
   * Top referrer leaderboard from ReferralAnalyticsSummary pre-aggregated table.
   */
  async getTopReferrers(entityType?: string, limit = 10): Promise<TopReferrer[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (entityType) params.set('entityType', entityType);
    const res = await apiService.get<TopReferrer[]>(`/v1/analytics/top-referrers?${params}`);
    return res.data ?? [];
  }

  // ── Business dashboard ───────────────────────────────────────────────────

  /**
   * Rich business analytics summary for the owner dashboard.
   * KPIs read from BusinessAnalyticsSummary when available.
   */
  async getBusinessSummary(businessId: string, days = 30): Promise<BusinessSummary | null> {
    const res = await apiService.get<BusinessSummary>(
      `/v1/analytics/business/${businessId}/summary?days=${days}`,
    );
    if (res.error || !res.data) return null;
    return res.data;
  }

  /**
   * Raw event-based metrics for a specific business.
   */
  async getBusinessAnalytics(businessId: string, days = 30): Promise<any | null> {
    const res = await apiService.get<any>(
      `/v1/analytics/business/${businessId}?days=${days}`,
    );
    if (res.error || !res.data) return null;
    return res.data;
  }

  // ── Event tracking ───────────────────────────────────────────────────────

  /**
   * Track a client-side analytics event (page views, button clicks, etc.).
   * Fire-and-forget — swallows errors so it never breaks the page.
   */
  trackEvent(data: {
    event: string;
    businessId?: string;
    metadata?: Record<string, any>;
  }): void {
    apiService.post('/v1/analytics/track', data).catch(() => {});
  }
}

export const analyticsService = new AnalyticsService();
