import { Injectable, BadRequestException } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { DatabaseService } from '../database.service';

@Injectable()
export class OfferRepository extends BaseRepository<any> {
  constructor(db: DatabaseService) {
    super(db, 'offer');
  }

  async findActiveOffers(tenantId: string, businessId?: string): Promise<any[]> {
    const criteria: any = {
      status: 'ACTIVE',
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
    };
    if (businessId) {
      criteria.businessId = businessId;
    }
    return this.model.findMany({
      where: this.buildWhere(tenantId, criteria),
      orderBy: { endDate: 'asc' },
    });
  }

  async incrementRedemptions(tenantId: string, offerId: string): Promise<any> {
    const offer = await this.findOne(tenantId, offerId);
    if (!offer) {
      throw new BadRequestException('Offer not found or access denied');
    }

    if (offer.maxRedemptions && offer.currentRedemptions >= offer.maxRedemptions) {
      throw new BadRequestException('Offer has reached its maximum redemption capacity');
    }

    return this.model.update({
      where: { id: offerId },
      data: {
        currentRedemptions: { increment: 1 },
      },
    });
  }
}
