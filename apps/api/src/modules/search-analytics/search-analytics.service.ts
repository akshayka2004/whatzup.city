import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class SearchAnalyticsService {
  private readonly logger = new Logger(SearchAnalyticsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Track a search query event (fire-and-forget, never blocks the response)
   */
  async trackSearch(data: {
    tenantId: string;
    userId?: string;
    query: string;
    resultCount: number;
    filters?: any;
    source?: string;
  }) {
    try {
      await this.db.analyticsEvent.create({
        data: {
          tenantId: data.tenantId,
          userId: data.userId,
          event: data.resultCount > 0 ? 'SEARCH_QUERY' : 'SEARCH_NO_RESULTS',
          metadata: {
            query: data.query,
            resultCount: data.resultCount,
            filters: data.filters,
            source: data.source || 'web',
          },
        },
      });

      // Increment popular search counter in Redis (for trending searches)
      const sanitizedQuery = data.query.toLowerCase().trim();
      if (sanitizedQuery && sanitizedQuery !== '*') {
        await this.redis.incr(`search:popular:${data.tenantId}:${sanitizedQuery}`);
        await this.redis.expire(`search:popular:${data.tenantId}:${sanitizedQuery}`, 86400); // 24h TTL
      }
    } catch (error) {
      this.logger.error('Failed to track search event', error);
      // Non-critical, swallow error
    }
  }

  /**
   * Track a business click/impression from search results
   */
  async trackClickThrough(data: {
    tenantId: string;
    userId?: string;
    businessId: string;
    query?: string;
    position?: number;
  }) {
    try {
      await this.db.analyticsEvent.create({
        data: {
          tenantId: data.tenantId,
          userId: data.userId,
          businessId: data.businessId,
          event: 'SEARCH_CLICK',
          metadata: {
            query: data.query,
            position: data.position,
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to track click-through', error);
    }
  }

  /**
   * Get search analytics summary for admin dashboard
   */
  async getSearchMetrics(tenantId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalSearches, noResultSearches, clickThroughs] = await Promise.all([
      this.db.analyticsEvent.count({
        where: { tenantId, event: 'SEARCH_QUERY', createdAt: { gte: since } },
      }),
      this.db.analyticsEvent.count({
        where: { tenantId, event: 'SEARCH_NO_RESULTS', createdAt: { gte: since } },
      }),
      this.db.analyticsEvent.count({
        where: { tenantId, event: 'SEARCH_CLICK', createdAt: { gte: since } },
      }),
    ]);

    const clickThroughRate =
      totalSearches > 0 ? Math.round((clickThroughs / totalSearches) * 10000) / 100 : 0;

    return {
      totalSearches,
      noResultSearches,
      clickThroughs,
      clickThroughRate, // percentage
      noResultRate:
        totalSearches > 0 ? Math.round((noResultSearches / totalSearches) * 10000) / 100 : 0,
      period: `${days} days`,
    };
  }

  /**
   * Get top searched terms
   */
  async getPopularSearchTerms(tenantId: string, days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const results = await this.db.analyticsEvent.findMany({
      where: {
        tenantId,
        event: { in: ['SEARCH_QUERY', 'SEARCH_NO_RESULTS'] },
        createdAt: { gte: since },
      },
      select: { metadata: true },
      orderBy: { createdAt: 'desc' },
      take: 500, // Bounded scan
    });

    // Aggregate query counts
    const queryMap = new Map<string, number>();
    for (const r of results) {
      const q = (r.metadata as any)?.query;
      if (q && q !== '*') {
        const key = q.toLowerCase().trim();
        queryMap.set(key, (queryMap.get(key) || 0) + 1);
      }
    }

    return Array.from(queryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([term, count]) => ({ term, count }));
  }
}
