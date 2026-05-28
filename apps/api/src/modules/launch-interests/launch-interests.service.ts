import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class LaunchInterestsService {
  constructor(private readonly db: DatabaseService) {}

  async findBusinesses(params: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(Number(params.limit) || 30, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.OR = [
        { businessName: { contains: params.search, mode: 'insensitive' } },
        { contactName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
        { category: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.db.launchBusinessInterest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.launchBusinessInterest.count({ where }),
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

  async findIndividuals(params: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(Number(params.limit) || 30, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.db.launchIndividualInterest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.launchIndividualInterest.count({ where }),
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

  async getStats() {
    const [businesses, individuals] = await Promise.all([
      this.db.launchBusinessInterest.count(),
      this.db.launchIndividualInterest.count(),
    ]);
    return { businesses, individuals, total: businesses + individuals };
  }
}
