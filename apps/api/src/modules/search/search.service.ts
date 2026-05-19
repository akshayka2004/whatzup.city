import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

/**
 * Search Service — Abstraction layer for search engines
 * Currently uses PostgreSQL full-text search, ready for Typesense/Elasticsearch
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly db: DatabaseService) {}

  async searchBusinesses(
    tenantId: string,
    query: string,
    filters?: { categoryId?: string; city?: string; minRating?: number },
    page = 1,
    limit = 20,
  ): Promise<any> {
    const where: any = { tenantId, status: 'APPROVED', deletedAt: null };
    if (query) {
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
        include: { category: { select: { id: true, name: true } } },
      }),
      this.db.business.count({ where }),
    ]);
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      query,
    };
  }

  /**
   * Index business in search engine
   * TODO: Implement with Typesense client
   */
  async indexBusiness(business: any) {
    this.logger.debug(`Indexing business: ${business.id}`);
  }

  /**
   * Remove business from search engine index
   */
  async removeFromIndex(businessId: string) {
    this.logger.debug(`Removing from index: ${businessId}`);
  }
}
