import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class TrendingService {
  private readonly logger = new Logger(TrendingService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  // ── Trending Businesses ───────────────────────────────────

  async getTrendingBusinesses(tenantId: string) {
    const cacheKey = `trending:businesses:${tenantId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    // Recalculate if cache is stale
    return this.recalculateTrendingBusinesses(tenantId);
  }

  async recalculateTrendingBusinesses(tenantId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Aggregate engagement signals from analytics events
    const engagementData = await this.db.analyticsEvent.groupBy({
      by: ['businessId'],
      where: {
        tenantId,
        businessId: { not: null },
        createdAt: { gte: thirtyDaysAgo },
        event: { in: ['BUSINESS_VIEW', 'BUSINESS_CLICK', 'OFFER_REDEEM', 'REVIEW_SUBMIT'] },
      },
      _count: true,
      orderBy: { _count: { businessId: 'desc' } },
      take: 20,
    });

    if (engagementData.length === 0) {
      // Fallback: use raw DB ordering
      const fallback = await this.db.business.findMany({
        where: { tenantId, status: 'APPROVED', deletedAt: null },
        orderBy: [{ totalReviews: 'desc' }, { averageRating: 'desc' }],
        take: 10,
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          city: true,
          averageRating: true,
          totalReviews: true,
        },
      });
      await this.redis.set(`trending:businesses:${tenantId}`, fallback, 1800);
      return fallback;
    }

    const businessIds = engagementData
      .filter((e) => e.businessId !== null)
      .map((e) => e.businessId as string);

    const businesses = await this.db.business.findMany({
      where: { id: { in: businessIds }, status: 'APPROVED', deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        city: true,
        averageRating: true,
        totalReviews: true,
      },
    });

    // Sort by engagement count
    const engagementMap = new Map(engagementData.map((e) => [e.businessId, e._count]));
    const sorted = businesses.sort(
      (a, b) => (engagementMap.get(b.id) || 0) - (engagementMap.get(a.id) || 0),
    );

    await this.redis.set(`trending:businesses:${tenantId}`, sorted, 1800); // 30 min
    return sorted;
  }

  // ── Trending Offers ───────────────────────────────────────

  async getTrendingOffers(tenantId: string) {
    const cacheKey = `trending:offers:${tenantId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const offers = await this.db.offer.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now },
        deletedAt: null,
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 10,
      include: {
        business: { select: { id: true, name: true, slug: true, logo: true } },
        _count: { select: { redemptions: true } },
      },
    });

    // Re-sort by redemption count descending (trending = most redeemed)
    const sorted = offers.sort(
      (a: any, b: any) => (b._count?.redemptions || 0) - (a._count?.redemptions || 0),
    );

    await this.redis.set(cacheKey, sorted, 1800);
    return sorted;
  }

  // ── Trending Categories ───────────────────────────────────

  async getTrendingCategories(tenantId: string) {
    const cacheKey = `trending:categories:${tenantId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const categories = await this.db.category.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
      include: {
        _count: {
          select: { businesses: { where: { status: 'APPROVED', deletedAt: null } } },
        },
      },
    });

    const sorted = categories
      .sort((a: any, b: any) => (b._count?.businesses || 0) - (a._count?.businesses || 0))
      .slice(0, 10);

    await this.redis.set(cacheKey, sorted, 1800);
    return sorted;
  }

  // ── Ranking Score Calculation ─────────────────────────────

  calculateRankingScore(business: any): number {
    const weights = {
      rating: 0.3,
      reviews: 0.2,
      verified: 0.15,
      offerActivity: 0.1,
      profileCompleteness: 0.1,
      recency: 0.15,
    };

    let score = 0;

    // Rating (0-5 normalized to 0-1)
    score += ((business.averageRating || 0) / 5) * weights.rating;

    // Reviews (logarithmic scale, capped at 100)
    const reviewScore = Math.min(Math.log10((business.totalReviews || 0) + 1) / 2, 1);
    score += reviewScore * weights.reviews;

    // Verified status bonus
    if (business.status === 'APPROVED') score += weights.verified;

    // Offer activity
    const offerCount = business._count?.offers || 0;
    score += Math.min(offerCount / 5, 1) * weights.offerActivity;

    // Profile completeness heuristic
    let completeness = 0;
    if (business.logo) completeness += 0.25;
    if (business.description) completeness += 0.25;
    if (business.phone) completeness += 0.25;
    if (business.operatingHours) completeness += 0.25;
    score += completeness * weights.profileCompleteness;

    // Recency (newer businesses get a slight boost, decays over 90 days)
    const ageInDays = (Date.now() - new Date(business.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(1 - ageInDays / 90, 0);
    score += recencyScore * weights.recency;

    return Math.round(score * 100) / 100; // 0.00 - 1.00
  }
}
