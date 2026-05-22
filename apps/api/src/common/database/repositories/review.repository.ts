import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { DatabaseService } from '../database.service';
import { PaginationParamsDto } from '../pagination';

@Injectable()
export class ReviewRepository extends BaseRepository<any> {
  constructor(db: DatabaseService) {
    super(db, 'review');
  }

  async findApprovedByBusiness(
    tenantId: string,
    businessId: string,
    pagination?: PaginationParamsDto,
  ) {
    return this.findMany(tenantId, { businessId, status: 'APPROVED' }, pagination, {
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        media: true,
      },
    });
  }

  async updateStatus(tenantId: string, id: string, status: string): Promise<any> {
    return this.update(tenantId, id, { status: status as any });
  }

  async markHelpful(tenantId: string, id: string): Promise<any> {
    const review = await this.findOne(tenantId, id);
    if (!review) {
      throw new Error(`Review not found or access denied`);
    }

    return this.model.update({
      where: { id },
      data: { helpfulCount: { increment: 1 } },
    });
  }
}
