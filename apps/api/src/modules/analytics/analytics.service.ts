import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
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
  async getOverview(tenantId: string) {
    const cacheKey = `analytics:overview:${tenantId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const [
      totalUsers,
      totalBusinesses,
      activeBusinesses,
      pendingApprovals,
      totalReviews,
      totalOffers,
    ] = await Promise.all([
      this.db.user.count({ where: { tenantId, deletedAt: null } }),
      this.db.business.count({ where: { tenantId, deletedAt: null } }),
      this.db.business.count({ where: { tenantId, status: 'APPROVED', deletedAt: null } }),
      this.db.business.count({
        where: {
          tenantId,
          status: { in: ['PENDING_VERIFICATION', 'UNDER_REVIEW'] },
          deletedAt: null,
        },
      }),
      this.db.review.count({ where: { business: { tenantId }, deletedAt: null } }),
      this.db.offer.count({ where: { business: { tenantId }, status: 'ACTIVE', deletedAt: null } }),
    ]);

    const overview = {
      totalUsers,
      totalBusinesses,
      activeBusinesses,
      pendingApprovals,
      totalReviews,
      totalOffers,
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

    // Verify tenant holds this business
    const business = await this.db.business.findFirst({
      where: { id: businessId, tenantId, deletedAt: null },
    });
    if (!business) {
      throw new ForbiddenException('Access denied to this business analytics.');
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Group events from DB
    const events = await this.db.analyticsEvent.groupBy({
      by: ['event'],
      where: {
        tenantId,
        businessId,
        createdAt: { gte: since },
      },
      _count: true,
    });

    const result = events.map((e) => ({ event: e.event, count: e._count }));
    await this.redis.set(cacheKey, result, 300);
    return result;
  }
}
