import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { VerifiedPurchaseRepository } from '../../common/database/repositories/verified-purchase.repository';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly verifiedPurchaseRepo: VerifiedPurchaseRepository,
  ) {}

  async create(
    userId: string,
    data: {
      businessId: string;
      rating: number;
      title?: string;
      comment: string;
      images?: string[];
    },
  ) {
    const business = await this.db.business.findUnique({
      where: { id: data.businessId },
      select: { tenantId: true },
    });
    const tenantId = business?.tenantId || 'default';

    // Verify Purchase Status automatically
    const isVerifiedPurchase = await this.verifiedPurchaseRepo.checkEligibility(
      tenantId,
      userId,
      data.businessId,
    );

    const review = await this.db.review.create({
      data: {
        tenantId,
        userId,
        businessId: data.businessId,
        rating: data.rating,
        title: data.title,
        comment: data.comment,
        isVerifiedPurchase, // Tag as verified if eligible
        media:
          data.images && data.images.length > 0
            ? {
                create: data.images.map((url: string) => ({
                  tenantId,
                  url,
                  type: 'IMAGE',
                })),
              }
            : undefined,
      },
    });
    // Recalculate business average rating
    const agg = await this.db.review.aggregate({
      where: { businessId: data.businessId, deletedAt: null, status: 'APPROVED' },
      _avg: { rating: true },
      _count: true,
    });
    await this.db.business.update({
      where: { id: data.businessId },
      data: { averageRating: agg._avg.rating || 0, totalReviews: agg._count },
    });
    return review;
  }

  async findByBusiness(businessId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.db.review.findMany({
        where: { businessId, deletedAt: null, status: 'APPROVED' },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, avatar: true } } },
      }),
      this.db.review.count({ where: { businessId, deletedAt: null, status: 'APPROVED' } }),
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
    };
  }

  async updateStatus(id: string, status: string) {
    return this.db.review.update({ where: { id }, data: { status: status as any } });
  }
  async markHelpful(id: string) {
    return this.db.review.update({ where: { id }, data: { helpfulCount: { increment: 1 } } });
  }
}
