import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { AnalyticsSummaryService } from './analytics-summary.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly summaryService: AnalyticsSummaryService,
  ) {}

  /**
   * Tracks an analytics event securely.
   */
  async trackEvent(data: {
    tenantId?: string;
    userId?: string;
    businessId?: string;
    event: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }): Promise<any> {
    const tenantId = data.tenantId || 'default';

    // Create the event record
    const eventRecord = await this.db.analyticsEvent.create({
      data: {
        tenantId,
        userId: data.userId,
        businessId: data.businessId,
        event: data.event,
        metadata: data.metadata || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        sessionId: data.sessionId,
      },
    });

    // Invalidate Redis overview cache on new events to keep stats fresh
    await this.redis.del(`analytics:overview:${tenantId}`);
    if (data.businessId) {
      await this.redis.del(`analytics:business:${tenantId}:${data.businessId}`);
    }

    return eventRecord;
  }

  /**
   * Platform-wide statistics overview
   */
  async getOverview(tenantId: string, role?: string) {
    // Platform admins (super/master) see global, cross-tenant totals.
    // Regular tenant admins stay scoped to their own tenant.
    const isPlatform = role === 'SUPER_ADMIN' || role === 'MASTER_ADMIN';
    const cacheKey = `analytics:overview:${isPlatform ? 'platform' : tenantId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const dbAny = this.db as any;

    // Scope filters — empty (global) for platform admins, else tenant-bound.
    const tScope = isPlatform ? {} : { tenantId };
    const bizRel = isPlatform ? {} : { tenantId };

    const [
      totalUsers,
      totalBusinesses,
      activeBusinesses,
      pendingApprovals,
      totalReviews,
      totalOffers,
      offerCustomerIds,
      totalComplaints,
      totalTenants,
      // Pre-aggregated — read from summary tables (fast, no full-scan)
      spendAgg,
      businessSummaryAgg,
    ] = await Promise.all([
      this.db.user.count({ where: { ...tScope, deletedAt: null } }),
      this.db.business.count({ where: { ...tScope, deletedAt: null } }),
      this.db.business.count({ where: { ...tScope, status: 'APPROVED', deletedAt: null } }),
      this.db.business.count({
        where: {
          ...tScope,
          status: { in: ['PENDING_VERIFICATION', 'UNDER_REVIEW'] },
          deletedAt: null,
        },
      }),
      this.db.review.count({ where: { business: bizRel, deletedAt: null } }),
      this.db.offer.count({ where: { business: bizRel, status: 'ACTIVE', deletedAt: null } }),
      // COUNT(DISTINCT user_id) — orders of magnitude faster than fetching all rows
      isPlatform
        ? this.db.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(DISTINCT user_id) AS count
            FROM offer_redemptions
            WHERE deleted_at IS NULL
          `
        : this.db.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(DISTINCT user_id) AS count
            FROM offer_redemptions
            WHERE tenant_id = ${tenantId}::uuid AND deleted_at IS NULL
          `,
      this.db.moderationReport.count({ where: isPlatform ? {} : { tenantId } }),
      isPlatform ? this.db.tenant.count() : Promise.resolve(1),
      // Aggregate spend from summary table (fast indexed scan)
      dbAny.userSpendingSummary
        ? dbAny.userSpendingSummary.aggregate({
            where: tScope,
            _sum: { totalSpend: true },
          }).catch(() => ({ _sum: { totalSpend: 0 } }))
        : Promise.resolve({ _sum: { totalSpend: 0 } }),
      // Aggregate CRM totals from business summary table
      dbAny.businessAnalyticsSummary
        ? dbAny.businessAnalyticsSummary.aggregate({
            where: tScope,
            _sum: { offerClaims: true, offerRedemptions: true, verifiedBillCount: true },
          }).catch(() => ({ _sum: { offerClaims: 0, offerRedemptions: 0, verifiedBillCount: 0 } }))
        : Promise.resolve({ _sum: { offerClaims: 0, offerRedemptions: 0, verifiedBillCount: 0 } }),
    ]);

    const totalClaims      = Number(businessSummaryAgg._sum?.offerClaims      ?? 0);
    const totalRedemptions = Number(businessSummaryAgg._sum?.offerRedemptions  ?? 0);
    const totalPlatformSpend = Number(spendAgg._sum?.totalSpend ?? 0);

    const overview = {
      totalUsers,
      totalBusinesses,
      activeBusinesses,
      pendingApprovals,
      totalReviews,
      totalOffers,
      activeOffers: totalOffers,
      totalTenants,
      totalOfferCustomers: Number((offerCustomerIds as any)[0]?.count ?? 0),
      totalRedemptions,
      totalClaims,
      totalComplaints,
      totalPlatformSpend,
      revenueThisMonth: 0,
      growthRate: 12.5,
    };

    await this.redis.set(cacheKey, overview, 300); // 5 mins cache TTL
    return overview;
  }

  /**
   * Fetch business-specific metrics safely isolated by tenant
   */
  async getBusinessAnalytics(tenantId: string, businessId: string, days = 30) {
    const cacheKey = `analytics:business:${tenantId}:${businessId}:${days}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    // Accept both business.id and entity.id (owners store entity.id in session)
    const business = await this.db.business.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        OR: [{ id: businessId }, { entityId: businessId }],
      },
      select: { id: true },
    });
    if (!business) {
      throw new ForbiddenException('Access denied to this business analytics.');
    }
    const actualBusinessId = business.id;

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Group events from DB
    const events = await this.db.analyticsEvent.groupBy({
      by: ['event'],
      where: {
        tenantId,
        businessId: actualBusinessId,
        createdAt: { gte: since },
      },
      _count: true,
    });

    // Also fetch real offer redemptions for this business
    const offerRedemptions = await this.db.offer.aggregate({
      where: { businessId: actualBusinessId, deletedAt: null },
      _sum: { currentRedemptions: true },
    });

    const result = {
      events: events.map((e) => ({ event: e.event, count: e._count })),
      totalRedemptions: offerRedemptions._sum.currentRedemptions ?? 0,
    };
    await this.redis.set(cacheKey, result, 300);
    return result;
  }

  /**
   * Rich business summary — all real DB data, no dependency on analytics event tracking.
   * Used by the business owner analytics dashboard.
   */
  async getBusinessSummary(tenantId: string, businessId: string, days = 30) {
    const cacheKey = `analytics:summary:${tenantId}:${businessId}:${days}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    // Accept entity.id OR business.id
    const business = await this.db.business.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        OR: [{ id: businessId }, { entityId: businessId }],
      },
      select: { id: true, averageRating: true, totalReviews: true },
    });
    if (!business) throw new ForbiddenException('Access denied to this business analytics.');
    const actualId = business.id;

    const since = new Date();
    since.setDate(since.getDate() - days);

    const db = this.db as any; // cast for businessCustomer access

    const [
      offerStats,
      redemptionHistory,
      teamCount,
      impressions,
      ratingDistribution,
      recentReviews,
      customerIds,
      crmStats,
    ] = await Promise.all([
      this.db.offer.findMany({
        where: { businessId: actualId, deletedAt: null },
        select: { title: true, status: true, discountPercent: true, currentRedemptions: true },
      }),
      this.db.offerRedemption.findMany({
        where: {
          offer: { businessId: actualId },
          createdAt: { gte: since },
          deletedAt: null,
        },
        select: { createdAt: true },
      }),
      this.db.businessStaff.count({
        where: { businessId: actualId, deletedAt: null, isActive: true },
      }),
      this.db.analyticsEvent.count({
        where: {
          businessId: actualId,
          event: { in: ['BUSINESS_VIEW', 'PROFILE_VIEW'] },
          createdAt: { gte: since },
        },
      }),
      this.db.review.groupBy({
        by: ['rating'],
        where: { businessId: actualId, deletedAt: null, status: 'APPROVED' },
        _count: true,
      }),
      this.db.review.findMany({
        where: { businessId: actualId, deletedAt: null, status: 'APPROVED' },
        select: {
          rating: true,
          title: true,
          comment: true,
          createdAt: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      // Distinct customers — raw SQL avoids full-scan on offerRedemptions
      this.db.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT r.user_id) AS count
        FROM offer_redemptions r
        INNER JOIN offers o ON o.id = r.offer_id
        WHERE r.tenant_id = ${tenantId}::uuid
          AND r.deleted_at IS NULL
          AND o.business_id = ${actualId}::uuid
      `,
      // CRM stats from BusinessCustomer table
      db.businessCustomer.aggregate({
        where: { businessId: actualId, deletedAt: null },
        _count: { _all: true },
        _sum: { offersClaimedCount: true, offersRedeemedCount: true },
      }).catch(() => ({ _count: { _all: 0 }, _sum: { offersClaimedCount: 0, offersRedeemedCount: 0 } })),
    ]);

    const activeOffers      = offerStats.filter((o) => o.status === 'ACTIVE').length;
    const totalOffers       = offerStats.length;
    const totalRedemptions  = offerStats.reduce((s, o) => s + o.currentRedemptions, 0);

    const offerPerformance = [...offerStats]
      .sort((a, b) => b.currentRedemptions - a.currentRedemptions)
      .slice(0, 8)
      .map((o) => ({
        title: o.title.length > 16 ? o.title.slice(0, 16) + '…' : o.title,
        redemptions: o.currentRedemptions,
        discount: o.discountPercent ?? 0,
        status: o.status,
      }));

    // Build day-by-day redemption trend
    const trendMap: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      trendMap[d.toISOString().split('T')[0]] = 0;
    }
    for (const r of redemptionHistory) {
      const key = r.createdAt.toISOString().split('T')[0];
      if (trendMap[key] !== undefined) trendMap[key]++;
    }
    const redemptionTrend = Object.entries(trendMap).map(([date, count]) => ({
      date: date.slice(5), // MM-DD — shorter for chart labels
      count,
    }));

    const ratingDist = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: ratingDistribution.find((r) => r.rating === stars)?._count ?? 0,
    }));

    const crmCustomers   = (crmStats as any)._count?._all ?? 0;
    const crmClaims      = (crmStats as any)._sum?.offersClaimedCount  ?? 0;
    const crmRedemptions = (crmStats as any)._sum?.offersRedeemedCount ?? 0;
    const redemptionRate = crmClaims > 0 ? Math.round((crmRedemptions / crmClaims) * 100) : 0;

    // Overlay with pre-aggregated summary if available (more accurate, already maintained)
    const summaryRow = await this.summaryService.getBusinessSummaryFromTable(actualId).catch(() => null);

    const finalCustomerCount = summaryRow?.customerCount
      ?? Math.max(Number((customerIds as any)[0]?.count ?? 0), crmCustomers);
    const finalClaims        = summaryRow?.offerClaims       ?? crmClaims;
    const finalRedemptions   = summaryRow?.offerRedemptions  ?? crmRedemptions;
    const finalConvRate      = summaryRow
      ? Math.round(summaryRow.conversionRate * 100)
      : redemptionRate;

    const result = {
      kpis: {
        activeOffers,
        totalOffers,
        totalRedemptions,
        avgRating: Number(business.averageRating) || null,
        totalReviews: business.totalReviews,
        teamCount,
        impressions,
        customerCount:       finalCustomerCount,
        totalClaims:         finalClaims,
        totalCrmRedemptions: finalRedemptions,
        redemptionRate:      finalConvRate,
      },
      offerPerformance,
      redemptionTrend,
      ratingDistribution: ratingDist,
      recentReviews: recentReviews.map((r) => ({
        rating: r.rating,
        title: r.title ?? null,
        comment: r.comment,
        author: (r.user as any)?.name ?? 'Customer',
        createdAt: r.createdAt,
      })),
    };

    await this.redis.set(cacheKey, result, 120); // 2-min cache
    return result;
  }

  /**
   * Fetch advanced, multi-dimensional detailed analytics for administrative audits.
   */
  async getDetailedAnalytics(tenantId: string) {
    const cacheKey = `analytics:detailed:${tenantId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const startOfPeriod = new Date();
    startOfPeriod.setDate(startOfPeriod.getDate() - 30);

    const [
      payments,
      redemptions,
      engagement,
      subscriptions,
      businessStatus,
      reports,
      escalatedBills,
      fraudFlags,
      customerGrowth,
      regional,
      branches,
    ] = await Promise.all([
      this.db.payment.findMany({
        where: { tenantId, status: 'SUCCESS', createdAt: { gte: startOfPeriod } },
        select: { amount: true, createdAt: true },
      }),
      this.db.offerRedemption.findMany({
        where: { tenantId, createdAt: { gte: startOfPeriod } },
        select: { createdAt: true },
      }),
      this.db.analyticsEvent.groupBy({
        by: ['event'],
        where: { tenantId, createdAt: { gte: startOfPeriod } },
        _count: true,
      }),
      this.db.subscription.groupBy({
        by: ['packageName', 'status'],
        where: { tenantId },
        _count: true,
      }),
      this.db.business.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
      this.db.moderationReport.groupBy({
        by: ['status', 'type'],
        where: { tenantId },
        _count: true,
      }),
      this.db.billVerification.count({
        where: { tenantId, escalationLevel: { not: 'NONE' } },
      }),
      this.db.fraudFlag.groupBy({
        by: ['severity', 'status'],
        where: { tenantId },
        _count: true,
      }),
      this.db.user.findMany({
        where: { tenantId, deletedAt: null, createdAt: { gte: startOfPeriod } },
        select: { createdAt: true },
      }),
      this.db.business.groupBy({
        by: ['city', 'state'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
      this.db.businessBranch.findMany({
        where: { tenantId, deletedAt: null },
        include: {
          business: {
            select: {
              name: true,
              averageRating: true,
            },
          },
        },
        take: 10,
      }),
    ]);

    // 1. Revenue trends
    const revenueTrendsMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      revenueTrendsMap[dateStr] = 0;
    }
    for (const pay of payments) {
      const dateStr = pay.createdAt.toISOString().split('T')[0];
      if (revenueTrendsMap[dateStr] !== undefined) {
        revenueTrendsMap[dateStr] += Number(pay.amount || 0);
      }
    }
    const revenueTrends = Object.entries(revenueTrendsMap)
      .map(([date, amount]) => ({ date, amount }))
      .reverse();

    // 2. Offer redemption trends
    const redemptionTrendsMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      redemptionTrendsMap[dateStr] = 0;
    }
    for (const red of redemptions) {
      const dateStr = red.createdAt.toISOString().split('T')[0];
      if (redemptionTrendsMap[dateStr] !== undefined) {
        redemptionTrendsMap[dateStr] += 1;
      }
    }
    const redemptionTrends = Object.entries(redemptionTrendsMap)
      .map(([date, count]) => ({ date, count }))
      .reverse();

    // 3. Customer growth trends
    const growthTrendsMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      growthTrendsMap[dateStr] = 0;
    }
    for (const user of customerGrowth) {
      const dateStr = user.createdAt.toISOString().split('T')[0];
      if (growthTrendsMap[dateStr] !== undefined) {
        growthTrendsMap[dateStr] += 1;
      }
    }
    const userGrowthTrends = Object.entries(growthTrendsMap)
      .map(([date, count]) => ({ date, count }))
      .reverse();

    // 4. Customer Engagement
    const engagementStats = engagement.map((e) => ({ event: e.event, count: e._count }));

    // 5. Subscription metrics
    const subscriptionStats = subscriptions.map((s) => ({
      package: s.packageName,
      status: s.status,
      count: s._count,
    }));

    // 6. Active/Inactive Businesses
    const businessStatusStats = businessStatus.map((b) => ({ status: b.status, count: b._count }));

    // 7. Support issue metrics
    const supportIssueStats = reports.map((r) => ({ type: r.type, status: r.status, count: r._count }));

    // 8. Issue escalation trends
    const escalatedBillCount = escalatedBills;

    // 9. Fraud indicators
    const fraudIndicatorsStats = fraudFlags.map((f) => ({
      severity: f.severity,
      status: f.status,
      count: f._count,
    }));

    // 10. Regional analytics
    const regionalStats = regional.map((r) => ({ city: r.city, state: r.state, count: r._count }));

    // 11. Branch performance
    const branchPerformance = branches.map((b) => ({
      branchId: b.id,
      branchName: b.name,
      businessName: b.business.name,
      rating: Number(b.business.averageRating),
    }));

    // 12. Offer conversion metrics
    const pageViews = engagement.find((e) => e.event === 'PAGE_VIEW')?._count || 0;
    const linkClicks = engagement.find((e) => e.event === 'CLICK_LINK')?._count || 0;
    const totalRedemptions = redemptions.length;
    const offerConversion = {
      views: pageViews,
      clicks: linkClicks,
      redemptions: totalRedemptions,
      clickThroughRate: pageViews > 0 ? (linkClicks / pageViews) * 100 : 0,
      conversionRate: pageViews > 0 ? (totalRedemptions / pageViews) * 100 : 0,
    };

    // 13. Moderation trends
    const resolvedCount = reports
      .filter((r) => r.status === 'RESOLVED')
      .reduce((acc, curr) => acc + curr._count, 0);
    const pendingCount = reports
      .filter((r) => r.status === 'PENDING')
      .reduce((acc, curr) => acc + curr._count, 0);
    const moderationTrends = {
      resolved: resolvedCount,
      pending: pendingCount,
      total: resolvedCount + pendingCount,
    };

    const result = {
      revenueTrends,
      redemptionTrends,
      userGrowthTrends,
      engagementStats,
      subscriptionStats,
      businessStatusStats,
      supportIssueStats,
      escalatedBillCount,
      fraudIndicatorsStats,
      regionalStats,
      branchPerformance,
      offerConversion,
      moderationTrends,
    };

    await this.redis.set(cacheKey, result, 1800); // 30-min cache
    return result;
  }
}
