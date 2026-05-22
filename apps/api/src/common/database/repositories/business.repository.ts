import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { DatabaseService } from '../database.service';
import { BusinessStatus } from '@saas/types';

@Injectable()
export class BusinessRepository extends BaseRepository<any> {
  constructor(db: DatabaseService) {
    super(db, 'business');
  }

  async findBySlug(
    tenantId: string,
    slug: string,
    options?: { include?: any },
  ): Promise<any | null> {
    return this.model.findFirst({
      where: this.buildWhere(tenantId, { slug }),
      include: options?.include,
    });
  }

  async updateStatus(tenantId: string, id: string, status: BusinessStatus): Promise<any> {
    return this.update(tenantId, id, {
      status,
      ...(status === BusinessStatus.APPROVED ? { verifiedAt: new Date(), isVerified: true } : {}),
    });
  }

  async findNearby(tenantId: string, lat: number, lng: number, radiusKm = 10): Promise<any[]> {
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

    return this.model.findMany({
      where: this.buildWhere(tenantId, {
        status: BusinessStatus.APPROVED,
        latitude: { gte: lat - latDelta, lte: lat + latDelta },
        longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
      }),
      take: 50,
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async incrementReviewStats(
    tenantId: string,
    id: string,
    rating: number,
    countChange: number,
  ): Promise<any> {
    const business = await this.findOne(tenantId, id);
    if (!business) {
      throw new NotFoundException(`Business listing not found`);
    }

    const currentTotal = business.totalReviews || 0;
    const currentRating = Number(business.averageRating) || 0;

    const newTotal = currentTotal + countChange;
    let newAvg = currentRating;

    if (newTotal > 0) {
      if (countChange > 0) {
        newAvg = (currentRating * currentTotal + rating) / newTotal;
      } else {
        // Approximate calculation on rating removal or skip complex recalculations unless full sync
        newAvg = Math.max(0, (currentRating * currentTotal - rating) / newTotal);
      }
    } else {
      newAvg = 0;
    }

    return this.model.update({
      where: { id },
      data: {
        totalReviews: newTotal,
        averageRating: newAvg,
      },
    });
  }
}
