import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  async getMetrics(tenantId: string, businessId: string) {
    const cacheKey = `dashboard:metrics:${tenantId}:${businessId}`;

    return this.redis.withCache(cacheKey, 300, async () => {
      const [views, clicks, reviews, redemptions] = await Promise.all([
        this.db.analyticsEvent.count({
          where: { tenantId, businessId, event: 'PAGE_VIEW' },
        }),
        this.db.analyticsEvent.count({
          where: { tenantId, businessId, event: 'CLICK_LINK' },
        }),
        this.db.review.count({
          where: { tenantId, businessId, deletedAt: null },
        }),
        this.db.offerRedemption.count({
          where: { tenantId, offer: { businessId } },
        }),
      ]);

      return { views, clicks, reviews, redemptions };
    });
  }

  async getProfileCompleteness(tenantId: string, businessId: string) {
    const cacheKey = `dashboard:completeness:${tenantId}:${businessId}`;

    return this.redis.withCache(cacheKey, 600, async () => {
      // Select only the fields we need — no full include blobs
      const business = await this.db.business.findUnique({
        where: { id: businessId },
        select: {
          name: true,
          description: true,
          logo: true,
          coverImage: true,
          phone: true,
          email: true,
          operatingHours: true,
          _count: { select: { branches: true, media: true } },
        },
      });

      if (!business) return { score: 0, missing: [] };

      let score = 0;
      const missing: string[] = [];
      const totalFields = 8;

      if (business.name) score += 1; else missing.push('name');
      if (business.description) score += 1; else missing.push('description');
      if (business.logo) score += 1; else missing.push('logo');
      if (business.coverImage) score += 1; else missing.push('coverImage');
      if (business.phone || business.email) score += 1; else missing.push('contact_info');
      if (business.operatingHours) score += 1; else missing.push('operating_hours');
      if (business._count.branches > 0) score += 1; else missing.push('branches');
      if (business._count.media > 0) score += 1; else missing.push('media');

      return { score: Math.round((score / totalFields) * 100), missing };
    });
  }

  /** Invalidate dashboard caches when business is updated */
  async invalidate(tenantId: string, businessId: string) {
    await Promise.all([
      this.redis.del(`dashboard:metrics:${tenantId}:${businessId}`),
      this.redis.del(`dashboard:completeness:${tenantId}:${businessId}`),
    ]);
  }
}
