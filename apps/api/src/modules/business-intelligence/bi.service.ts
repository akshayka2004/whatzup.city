import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class BusinessIntelligenceService {
  private readonly logger = new Logger(BusinessIntelligenceService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Retrieves high-level aggregated platform analytics for master/super admins
   */
  async getPlatformKPIs(tenantId: string, days = 30) {
    const cacheKey = `bi:platform-kpi:${tenantId}:${days}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);

    // 1. Total and Active counts
    const [totalUsers, activeLogins, totalBusinesses, activeBusinesses, totalReviews, totalOffers] =
      await Promise.all([
        this.db.user.count({ where: { tenantId, deletedAt: null } }),
        this.db.deviceLogin.count({
          where: { tenantId, lastLoginAt: { gte: thresholdDate } },
        }),
        this.db.business.count({ where: { tenantId, deletedAt: null } }),
        this.db.business.count({ where: { tenantId, status: 'APPROVED', deletedAt: null } }),
        this.db.review.count({
          where: {
            business: { tenantId },
            deletedAt: null,
          },
        }),
        this.db.offer.count({
          where: {
            business: { tenantId },
            deletedAt: null,
          },
        }),
      ]);

    // 2. Events Summary (Views, Clicks, redemptions)
    const eventsGrouped = await this.db.analyticsEvent.groupBy({
      by: ['event'],
      where: {
        tenantId,
        createdAt: { gte: thresholdDate },
      },
      _count: true,
    });

    const counts: Record<string, number> = {};
    for (const e of eventsGrouped) {
      counts[e.event] = e._count;
    }

    const views = counts['BUSINESS_VIEW'] || 0;
    const clicks = counts['OFFER_CLICK'] || 0;
    const redemptions = counts['OFFER_REDEMPTION'] || 0;

    // Click Through Rate (CTR) and conversion calculations
    const searchCtr = views > 0 ? (clicks / views) * 100 : 0;
    const redemptionRate = clicks > 0 ? (redemptions / clicks) * 100 : 0;

    // 3. Fraud flags frequency
    const openFraudFlags = await this.db.fraudFlag.count({
      where: { tenantId, status: 'OPEN', deletedAt: null },
    });

    const kpiSummary = {
      userKPIs: {
        totalRegistered: totalUsers,
        activeMonthlyUsers: activeLogins,
        retentionRate: totalUsers > 0 ? (activeLogins / totalUsers) * 100 : 0,
      },
      businessKPIs: {
        totalRegistered: totalBusinesses,
        activeApproved: activeBusinesses,
        verificationRate: totalBusinesses > 0 ? (activeBusinesses / totalBusinesses) * 100 : 0,
      },
      engagementKPIs: {
        totalOffersActive: totalOffers,
        totalReviewsWritten: totalReviews,
        viewsLast30Days: views,
        clicksLast30Days: clicks,
        redemptionsLast30Days: redemptions,
        searchCtr: Number(searchCtr.toFixed(2)),
        redemptionRate: Number(redemptionRate.toFixed(2)),
      },
      securityKPIs: {
        pendingFraudReviews: openFraudFlags,
      },
      generatedAt: new Date(),
    };

    await this.redis.set(cacheKey, kpiSummary, 1800); // 30 min cache TTL
    return kpiSummary;
  }

  /**
   * Retrieves recommendation performance analytics
   */
  async getRecommendationAnalytics(tenantId: string, days = 30) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);

    const [clicks, conversions] = await Promise.all([
      this.db.analyticsEvent.count({
        where: {
          tenantId,
          event: 'RECOMMENDATION_CLICK',
          createdAt: { gte: thresholdDate },
        },
      }),
      this.db.analyticsEvent.count({
        where: {
          tenantId,
          event: 'RECOMMENDATION_CONVERSION',
          createdAt: { gte: thresholdDate },
        },
      }),
    ]);

    return {
      recommendationClicks: clicks,
      recommendationConversions: conversions,
      conversionRate: clicks > 0 ? Number(((conversions / clicks) * 100).toFixed(2)) : 0,
    };
  }
}
