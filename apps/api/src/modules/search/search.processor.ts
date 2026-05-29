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
            include: {
              category: { select: { name: true } },
              branches: { select: { name: true }, take: 10 },
              offers: { select: { title: true }, where: { deletedAt: null }, take: 20 },
              businessTags: { select: { tag: true } },
            },
          });

          if (!business) return;

          const biz = business as any;

          // Aggregate extra searchable text fields
          const branchNames = (biz.branches ?? []).map((b: any) => b.name).filter(Boolean).join(' ');
          const offerTitles = (biz.offers ?? []).map((o: any) => o.title).filter(Boolean).join(' ');
          const tags: string[] = (biz.businessTags ?? []).map((t: any) => t.tag).filter(Boolean);
          const productNames = ''; // Products not in this query path; extend here if model grows

          // Transform for Typesense Document schema
          const document = {
            id: business.id,
            tenantId: business.tenantId,
            name: business.name,
            description: business.description || '',
            categoryId: business.categoryId,
            categoryName: biz.category?.name || '',
            subcategoryName: (business as any).subcategory || '',
            tags: tags.length ? tags : undefined,
            branchNames: branchNames || undefined,
            offerTitles: offerTitles || undefined,
            productNames: productNames || undefined,
            city: business.city,
            location:
              business.latitude && business.longitude
                ? [Number(business.latitude), Number(business.longitude)]
                : undefined,
            averageRating: business.averageRating != null ? Number(business.averageRating) : 0,
            totalReviews: business.totalReviews != null ? Number(business.totalReviews) : 0,
            status: business.status,
            createdAt: business.createdAt.getTime(),
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
