import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { VerifiedPurchaseRepository } from '../../common/database/repositories/verified-purchase.repository';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly verifiedPurchaseRepo: VerifiedPurchaseRepository,
    private readonly redis: RedisService,
  ) {}

  /**
   * Recompute a business's averageRating + totalReviews from APPROVED reviews
   * and bust the cached business copy (findById caches under business:{id} for
   * 5 min, otherwise the rating shows stale after any review change).
   */
  private async refreshBusinessRating(businessId: string) {
    const agg = await this.db.review.aggregate({
      where: { businessId, deletedAt: null, status: 'APPROVED' },
      _avg: { rating: true },
      _count: true,
    });
    const biz = await this.db.business.update({
      where: { id: businessId },
      data: { averageRating: agg._avg.rating || 0, totalReviews: agg._count },
      select: { id: true, slug: true },
    });
    await this.redis.del(`business:${biz.id}`).catch(() => {});
    if (biz.slug) await this.redis.del(`business:${biz.slug}`).catch(() => {});
  }

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
    // Resolve business by id OR entityId so a mismatched id can't silently
    // create an orphan review or skip the rating update.
    const business = await this.db.business.findFirst({
      where: { OR: [{ id: data.businessId }, { entityId: data.businessId }] },
      select: { id: true, tenantId: true },
    });
    if (!business) throw new NotFoundException('Business not found');
    const businessId = business.id;
    const tenantId = business.tenantId;

    // Verify Purchase Status automatically
    const isVerifiedPurchase = await this.verifiedPurchaseRepo.checkEligibility(
      tenantId,
      userId,
      businessId,
    );

    const review = await this.db.review.create({
      data: {
        tenantId,
        userId,
        businessId,
        rating: data.rating,
        title: data.title,
        comment: data.comment,
        status: 'APPROVED', // Auto-publish so rating reflects immediately (moderate-after)
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
    // Recompute rating + bust the cached business copy
    await this.refreshBusinessRating(businessId);
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
    const review = await this.db.review.update({
      where: { id },
      data: { status: status as any },
      select: { businessId: true },
    });
    // Status change alters the APPROVED set → recompute rating + bust cache
    await this.refreshBusinessRating(review.businessId);
    return review;
  }
  async markHelpful(id: string) {
    return this.db.review.update({ where: { id }, data: { helpfulCount: { increment: 1 } } });
  }
}
