import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TypesenseService } from '../typesense/typesense.service';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class SearchService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly typesenseService: TypesenseService,
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    @InjectQueue('search-queue') private readonly searchQueue: Queue,
  ) {}

  async onApplicationBootstrap() {
    try {
      const isEnabled = this.typesenseService.getEnabled();
      if (isEnabled) {
        const hasDocs = await this.typesenseService.hasDocuments('businesses');
        if (!hasDocs) {
          this.logger.log('Typesense businesses collection is empty. Syncing from database...');
          const businesses = await this.db.business.findMany({
            where: { deletedAt: null },
            select: { id: true, tenantId: true },
          });
          this.logger.log(`Found ${businesses.length} businesses in database to index.`);
          for (const biz of businesses) {
            await this.indexBusiness(biz.id, biz.tenantId);
          }
          this.logger.log('Typesense sync jobs queued successfully.');
        }
      }
    } catch (err) {
      this.logger.error('Failed to auto-sync Typesense search index', err);
    }
  }

  /**
   * Main Search Endpoint (Typesense First, Postgres Fallback)
   */
  async searchBusinesses(
    tenantId: string,
    query: string,
    filters?: { categoryId?: string; city?: string; minRating?: number },
    page = 1,
    limit = 20,
    isPublic = false,
  ): Promise<any> {
    const cacheKey = `search:${tenantId}:${query}:${JSON.stringify(filters)}:${page}:${isPublic}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    try {
      const searchParams: any = {
        q: query,
        query_by: 'name,description,categoryName',
        filter_by: isPublic ? '' : `tenantId:=${tenantId}`,
        page,
        per_page: limit,
      };

      if (filters?.categoryId) {
        searchParams.filter_by = searchParams.filter_by
          ? `${searchParams.filter_by} && categoryId:=${filters.categoryId}`
          : `categoryId:=${filters.categoryId}`;
      }
      if (filters?.city) {
        searchParams.filter_by = searchParams.filter_by
          ? `${searchParams.filter_by} && city:=${filters.city}`
          : `city:=${filters.city}`;
      }
      if (filters?.minRating) {
        searchParams.filter_by = searchParams.filter_by
          ? `${searchParams.filter_by} && averageRating:>=${filters.minRating}`
          : `averageRating:>=${filters.minRating}`;
      }

      const typesenseResults = await this.typesenseService.search('businesses', searchParams);
      if (typesenseResults && typesenseResults.hits && typesenseResults.hits.length > 0) {
        const response = {
          data: typesenseResults.hits.map((hit: any) => hit.document),
          meta: {
            total: typesenseResults.found,
            page: typesenseResults.page,
            limit: searchParams.per_page,
          },
          source: 'typesense',
        };
        await this.redis.set(cacheKey, response, 300); // 5 min TTL
        return response;
      }
    } catch (error) {
      this.logger.warn('Typesense search failed, falling back to PostgreSQL');
    }

    // Postgres Fallback
    const where: any = isPublic
      ? { deletedAt: null }
      : { tenantId, deletedAt: null };
    if (query && query !== '*') {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.city) where.city = { contains: filters.city, mode: 'insensitive' };
    if (filters?.minRating) where.averageRating = { gte: filters.minRating };

    const [data, total] = await Promise.all([
      this.db.business.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { averageRating: 'desc' },
      }),
      this.db.business.count({ where }),
    ]);

    const strippedData = data.map((biz: any) => {
      const copy = { ...biz };
      delete copy.ownerName;
      delete copy.ownerId;
      return copy;
    });

    const response = {
      data: strippedData,
      meta: { total, page, limit },
      source: 'postgres',
    };
    await this.redis.set(cacheKey, response, 300);
    return response;
  }

  /**
   * Geo-Search Implementation
   */
  async nearbyBusinesses(tenantId: string, lat: number, lng: number, radius: number, page = 1) {
    try {
      const searchParams = {
        q: '*',
        query_by: 'name',
        filter_by: `location:(${lat}, ${lng}, ${radius} mi)`,
        sort_by: `location(${lat}, ${lng}):asc`,
        page,
        per_page: 20,
      };

      const results = await this.typesenseService.search('businesses', searchParams);
      if (results && results.hits) {
        return {
          data: results.hits.map((h: any) => h.document),
          meta: { total: results.found, page },
          source: 'typesense',
        };
      }
    } catch (e) {
      this.logger.warn('Geo-search typesense failed, returning empty');
    }

    // Fallback: Haversine approximation in Postgres (simplified for MVP)
    return { data: [], meta: { total: 0, page }, source: 'fallback' };
  }

  /**
   * Basic Recommendation Engine (Highly Rated & Verified)
   */
  async getRecommendations(tenantId: string, userId: string) {
    const cacheKey = `recommendations:${tenantId}:${userId}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const data = await this.db.business.findMany({
      where: { deletedAt: null },
      orderBy: [{ averageRating: 'desc' }, { totalReviews: 'desc' }],
      take: 10,
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        city: true,
        averageRating: true,
        totalReviews: true,
        description: true,
        isVerified: true,
      },
    });

    await this.redis.set(cacheKey, data, 3600); // 1 hour TTL
    return data;
  }

  /**
   * Trending Engine (Cached heavily)
   */
  async getTrending(tenantId: string) {
    const cacheKey = `trending:${tenantId}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const data = await this.db.business.findMany({
      where: { deletedAt: null },
      orderBy: [{ totalReviews: 'desc' }, { createdAt: 'desc' }],
      take: 10,
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        city: true,
        averageRating: true,
        totalReviews: true,
        isVerified: true,
      },
    });

    await this.redis.set(cacheKey, data, 1800); // 30 min TTL
    return data;
  }

  /**
   * Dispatch async indexing jobs
   */
  async indexBusiness(businessId: string, tenantId: string) {
    await this.searchQueue.add('sync-business', {
      action: 'INDEX',
      type: 'BUSINESS',
      id: businessId,
      tenantId,
    });
  }

  async removeFromIndex(businessId: string, tenantId: string) {
    await this.searchQueue.add('sync-business', {
      action: 'REMOVE',
      type: 'BUSINESS',
      id: businessId,
      tenantId,
    });
  }
}
