import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DatabaseService } from '../../common/database/database.service';
import { MetricsService } from './metrics.service';

@Processor('metrics-queue')
export class MetricsProcessor extends WorkerHost {
  private readonly logger = new Logger(MetricsProcessor.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly metricsService: MetricsService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing metrics job: ${job.name} (ID: ${job.id})`);

    switch (job.name) {
      case 'aggregate-daily-metrics':
        return this.handleDailyAggregation(job.data);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return null;
    }
  }

  private async handleDailyAggregation(data: { date?: string; tenantId?: string }) {
    const targetDate = data.date ? new Date(data.date) : new Date();
    // Start and end of the day in question
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    this.logger.log(
      `Aggregating metrics for range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`,
    );

    // Fetch all active businesses
    const tenantFilter = data.tenantId ? { tenantId: data.tenantId } : {};
    const businesses = await this.db.business.findMany({
      where: {
        ...tenantFilter,
        deletedAt: null,
      },
      select: { id: true, tenantId: true },
    });

    this.logger.log(`Found ${businesses.length} businesses for aggregation`);

    for (const biz of businesses) {
      try {
        // Query view events
        const viewsCount = await this.db.analyticsEvent.count({
          where: {
            tenantId: biz.tenantId,
            businessId: biz.id,
            event: 'BUSINESS_VIEW',
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        });

        // Query click events (e.g. website, call, map clicks)
        const clicksCount = await this.db.analyticsEvent.count({
          where: {
            tenantId: biz.tenantId,
            businessId: biz.id,
            event: 'OFFER_CLICK',
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        });

        // Query redemption events
        const redemptionsCount = await this.db.analyticsEvent.count({
          where: {
            tenantId: biz.tenantId,
            businessId: biz.id,
            event: 'OFFER_REDEMPTION',
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        });

        // Query reviews posted today
        const reviews = await this.db.review.findMany({
          where: {
            businessId: biz.id,
            createdAt: { gte: startOfDay, lte: endOfDay },
            deletedAt: null,
          },
          select: { rating: true },
        });

        const reviewsCount = reviews.length;
        const averageRating =
          reviewsCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount : 0;

        // Upsert aggregate metric row
        await this.metricsService.upsertDailyMetric(biz.tenantId, biz.id, startOfDay, {
          viewCount: viewsCount,
          clickCount: clicksCount,
          redemptionCount: redemptionsCount,
          reviewCount: reviewsCount,
          averageRating,
        });
      } catch (err: any) {
        this.logger.error(
          `Failed to aggregate metrics for business ${biz.id}: ${err.message}`,
          err.stack,
        );
      }
    }

    return { aggregated: businesses.length };
  }
}
