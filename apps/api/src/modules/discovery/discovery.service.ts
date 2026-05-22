import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  // ── Category Discovery ────────────────────────────────────

  async getCategories(tenantId: string) {
    const cacheKey = `discovery:categories:${tenantId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const categories = await this.db.category.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { businesses: { where: { status: 'APPROVED', deletedAt: null } } },
        },
      },
    });

    await this.redis.set(cacheKey, categories, 1800); // 30 min
    return categories;
  }

  async getCategoryWithBusinesses(tenantId: string, categoryId: string, page = 1, limit = 20) {
    const category = await this.db.category.findFirst({
      where: { id: categoryId, tenantId, deletedAt: null },
    });

    const [businesses, total] = await Promise.all([
      this.db.business.findMany({
        where: { tenantId, categoryId, status: 'APPROVED', deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ averageRating: 'desc' }, { totalReviews: 'desc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          city: true,
          averageRating: true,
          totalReviews: true,
          description: true,
        },
      }),
      this.db.business.count({
        where: { tenantId, categoryId, status: 'APPROVED', deletedAt: null },
      }),
    ]);

    return {
      category,
      businesses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
      },
    };
  }

  // ── Offer Discovery ───────────────────────────────────────

  async getActiveOffers(tenantId: string, page = 1, limit = 20) {
    const cacheKey = `discovery:offers:${tenantId}:${page}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const now = new Date();

    const [offers, total] = await Promise.all([
      this.db.offer.findMany({
        where: {
          tenantId,
          status: 'ACTIVE',
          startDate: { lte: now },
          endDate: { gte: now },
          deletedAt: null,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { endDate: 'asc' }, // Expiring soonest first
        include: {
          business: {
            select: { id: true, name: true, slug: true, logo: true, city: true },
          },
        },
      }),
      this.db.offer.count({
        where: {
          tenantId,
          status: 'ACTIVE',
          startDate: { lte: now },
          endDate: { gte: now },
          deletedAt: null,
        },
      }),
    ]);

    const result = {
      data: offers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
      },
    };

    await this.redis.set(cacheKey, result, 600); // 10 min
    return result;
  }

  // ── Homepage Feed ─────────────────────────────────────────

  async getHomepageFeed(tenantId: string) {
    const cacheKey = `discovery:homepage:${tenantId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const [topRated, newBusinesses, featuredOffers, categories] = await Promise.all([
      this.db.business.findMany({
        where: { tenantId, status: 'APPROVED', deletedAt: null },
        orderBy: { averageRating: 'desc' },
        take: 6,
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          city: true,
          averageRating: true,
          totalReviews: true,
        },
      }),
      this.db.business.findMany({
        where: { tenantId, status: 'APPROVED', deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          city: true,
          averageRating: true,
          createdAt: true,
        },
      }),
      this.db.offer.findMany({
        where: {
          tenantId,
          status: 'ACTIVE',
          endDate: { gte: new Date() },
          deletedAt: null,
        },
        orderBy: { endDate: 'asc' },
        take: 4,
        include: {
          business: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.db.category.findMany({
        where: { tenantId, isActive: true, deletedAt: null, parentId: null },
        orderBy: { sortOrder: 'asc' },
        take: 12,
        select: { id: true, name: true, slug: true, icon: true },
      }),
    ]);

    const feed = { topRated, newBusinesses, featuredOffers, categories };
    await this.redis.set(cacheKey, feed, 900); // 15 min
    return feed;
  }
}
