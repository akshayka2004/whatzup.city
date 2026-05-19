import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { BusinessStatus } from '@saas/types';

@Injectable()
export class BusinessesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  async create(tenantId: string, ownerId: string, data: any) {
    const slug = this.generateSlug(data.name);
    return this.db.business.create({
      data: {
        tenantId,
        ownerId,
        slug,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        latitude: data.latitude,
        longitude: data.longitude,
        phone: data.phone,
        email: data.email,
        website: data.website,
        operatingHours: data.operatingHours,
        status: BusinessStatus.PENDING,
      },
    });
  }

  async findAll(
    tenantId: string,
    params: {
      page?: number;
      limit?: number;
      categoryId?: string;
      city?: string;
      status?: string;
      search?: string;
    },
  ) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const where: any = { tenantId, deletedAt: null };

    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.city) where.city = { contains: params.city, mode: 'insensitive' };
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.db.business.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { category: { select: { id: true, name: true, slug: true } } },
      }),
      this.db.business.count({ where }),
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

  async findById(id: string) {
    const cached = await this.redis.get(`business:${id}`);
    if (cached) return cached;

    const business = await this.db.business.findUnique({
      where: { id, deletedAt: null },
      include: {
        category: true,
        branches: { where: { isActive: true } },
        _count: { select: { reviews: true, products: true, offers: true } },
      },
    });
    if (!business) throw new NotFoundException('Business not found');

    await this.redis.set(`business:${id}`, business, 300);
    return business;
  }

  async findBySlug(tenantId: string, slug: string) {
    const business = await this.db.business.findUnique({
      where: { tenantId_slug: { tenantId, slug }, deletedAt: null },
      include: {
        category: true,
        branches: { where: { isActive: true } },
        _count: { select: { reviews: true, products: true, offers: true } },
      },
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async update(id: string, ownerId: string, data: any) {
    const business = await this.db.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== ownerId) throw new ForbiddenException('Not authorized');

    const updated = await this.db.business.update({ where: { id }, data });
    await this.redis.del(`business:${id}`);
    return updated;
  }

  async updateStatus(id: string, status: BusinessStatus) {
    const updated = await this.db.business.update({
      where: { id },
      data: {
        status,
        ...(status === BusinessStatus.APPROVED ? { verifiedAt: new Date(), isVerified: true } : {}),
      },
    });
    await this.redis.del(`business:${id}`);
    return updated;
  }

  async getOwnerBusinesses(ownerId: string) {
    return this.db.business.findMany({
      where: { ownerId, deletedAt: null },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getNearby(tenantId: string, lat: number, lng: number, radiusKm: number = 10) {
    // PostGIS or manual haversine calculation
    // For MVP, use bounding box approximation
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

    return this.db.business.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: BusinessStatus.APPROVED,
        latitude: { gte: lat - latDelta, lte: lat + latDelta },
        longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
      },
      take: 50,
      include: { category: { select: { id: true, name: true } } },
    });
  }

  private generateSlug(name: string): string {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Date.now().toString(36)
    );
  }
}
