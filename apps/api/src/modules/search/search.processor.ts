import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { TypesenseService } from '../typesense/typesense.service';
import { BusinessRepository } from '../../common/database/repositories/business.repository';

@Processor('search-queue')
export class SearchProcessor extends WorkerHost {
  private readonly logger = new Logger(SearchProcessor.name);

  constructor(
    private readonly typesenseService: TypesenseService,
    private readonly businessRepo: BusinessRepository,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { tenantId, action, type, id } = job.data;

    this.logger.log(`Processing Search Sync Job: [${action}] ${type} - ${id}`);

    try {
      if (type === 'BUSINESS') {
        if (action === 'INDEX') {
          const business = await this.businessRepo.findOne(tenantId, id, {
            include: { category: { select: { name: true } } },
          });

          if (!business) return;

          // Transform for Typesense Document schema
          const document = {
            id: business.id,
            tenantId: business.tenantId,
            name: business.name,
            description: business.description || '',
            categoryId: business.categoryId,
            categoryName: business.category?.name || '',
            city: business.city,
            location:
              business.latitude && business.longitude
                ? [business.latitude, business.longitude]
                : undefined,
            averageRating: business.averageRating,
            totalReviews: business.totalReviews,
            status: business.status,
            createdAt: business.createdAt.getTime(), // Using timestamps for faster sorting
          };

          await this.typesenseService.indexDocument('businesses', document);
        } else if (action === 'REMOVE') {
          await this.typesenseService.removeDocument('businesses', id);
        }
      }
    } catch (error) {
      this.logger.error(`Search Sync failed: [${action}] ${type} - ${id}`, error);
      throw error; // Triggers BullMQ retry backoff
    }
  }
}
