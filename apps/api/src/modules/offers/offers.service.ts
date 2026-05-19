import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class OffersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  async create(businessId: string, data: any) {
    const offer = await this.db.offer.create({ data: { businessId, ...data } });
    await this.redis.delPattern('offers:*');
    return offer;
  }

  async findActive(tenantId: string, page = 1, limit = 20) {
    const now = new Date();
    const where = {
      status: 'ACTIVE' as const,
      startDate: { lte: now },
      endDate: { gte: now },
      deletedAt: null,
      business: { tenantId, status: 'APPROVED' as const },
    };
    const [data, total] = await Promise.all([
      this.db.offer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { business: { select: { id: true, name: true, slug: true, logo: true } } },
      }),
      this.db.offer.count({ where }),
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

  async findByBusiness(businessId: string) {
    return this.db.offer.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const offer = await this.db.offer.findUnique({
      where: { id, deletedAt: null },
      include: { business: { select: { id: true, name: true, slug: true } } },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    return offer;
  }

  async update(id: string, data: any) {
    const offer = await this.db.offer.update({ where: { id }, data });
    await this.redis.delPattern('offers:*');
    return offer;
  }

  async redeem(id: string) {
    return this.db.offer.update({ where: { id }, data: { currentRedemptions: { increment: 1 } } });
  }

  async softDelete(id: string) {
    await this.db.offer.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.redis.delPattern('offers:*');
  }
}
