import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  async trackEvent(data: {
    userId?: string;
    businessId?: string;
    event: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }): Promise<any> {
    return this.db.analyticsEvent.create({ data });
  }

  async getOverview(tenantId: string) {
    const cached = await this.redis.get(`analytics:overview:${tenantId}`);
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
      this.db.business.count({ where: { tenantId, status: 'PENDING', deletedAt: null } }),
      this.db.review.count({ where: { deletedAt: null } }),
      this.db.offer.count({ where: { status: 'ACTIVE', deletedAt: null } }),
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
    await this.redis.set(`analytics:overview:${tenantId}`, overview, 300);
    return overview;
  }

  async getBusinessAnalytics(businessId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const events = await this.db.analyticsEvent.groupBy({
      by: ['event'],
      where: { businessId, createdAt: { gte: since } },
      _count: true,
    });
    return events.map((e) => ({ event: e.event, count: e._count }));
  }
}
