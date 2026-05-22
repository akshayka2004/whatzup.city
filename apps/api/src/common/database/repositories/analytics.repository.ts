import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { DatabaseService } from '../database.service';

@Injectable()
export class AnalyticsRepository extends BaseRepository<any> {
  constructor(db: DatabaseService) {
    super(db, 'analyticsEvent');
  }

  async trackEvent(
    tenantId: string,
    userId: string | null,
    businessId: string | null,
    event: string,
    metadata: any = {},
    ipAddress?: string,
    userAgent?: string,
  ): Promise<any> {
    return this.model.create({
      data: {
        tenantId,
        userId,
        businessId,
        event,
        metadata,
        ipAddress,
        userAgent,
      },
    });
  }

  async getBusinessMetrics(
    tenantId: string,
    businessId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    return this.db.businessMetric.findMany({
      where: {
        tenantId,
        businessId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });
  }
}
