import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { TrendingService } from './trending.service';

@Processor('trending-queue')
export class TrendingProcessor extends WorkerHost {
  private readonly logger = new Logger(TrendingProcessor.name);

  constructor(private readonly trendingService: TrendingService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { tenantId, type } = job.data;
    this.logger.log(`Recalculating trending [${type}] for tenant: ${tenantId}`);

    try {
      switch (type) {
        case 'BUSINESSES':
          await this.trendingService.recalculateTrendingBusinesses(tenantId);
          break;
        case 'ALL':
          await Promise.all([
            this.trendingService.recalculateTrendingBusinesses(tenantId),
            this.trendingService.getTrendingOffers(tenantId),
            this.trendingService.getTrendingCategories(tenantId),
          ]);
          break;
        default:
          this.logger.warn(`Unknown trending recalculation type: ${type}`);
      }
    } catch (error) {
      this.logger.error(`Trending recalculation failed: ${error.message}`);
      throw error;
    }
  }
}
