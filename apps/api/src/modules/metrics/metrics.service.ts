import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Find precomputed metrics for a business in a date range
   */
  async getBusinessMetrics(tenantId: string, businessId: string, from: Date, to: Date) {
    return this.db.businessMetric.findMany({
      where: {
        tenantId,
        businessId,
        date: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Upsert a daily precomputed metric record
   */
  async upsertDailyMetric(
    tenantId: string,
    businessId: string,
    date: Date,
    data: {
      viewCount: number;
      clickCount: number;
      redemptionCount: number;
      reviewCount: number;
      averageRating: number;
    },
  ) {
    const dateOnly = new Date(date.toISOString().split('T')[0]); // Ensure date only (no time part)

    return this.db.businessMetric.upsert({
      where: {
        tenantId_businessId_date: {
          tenantId,
          businessId,
          date: dateOnly,
        },
      },
      create: {
        tenantId,
        businessId,
        date: dateOnly,
        viewCount: data.viewCount,
        clickCount: data.clickCount,
        redemptionCount: data.redemptionCount,
        reviewCount: data.reviewCount,
        averageRating: data.averageRating,
      },
      update: {
        viewCount: data.viewCount,
        clickCount: data.clickCount,
        redemptionCount: data.redemptionCount,
        reviewCount: data.reviewCount,
        averageRating: data.averageRating,
      },
    });
  }
}
