import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class ProductsService {
  constructor(private readonly db: DatabaseService) {}

  async create(businessId: string, data: any) {
    return this.db.product.create({ data: { businessId, ...data } });
  }

  async findByBusiness(businessId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.db.product.findMany({
        where: { businessId, deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { sortOrder: 'asc' },
      }),
      this.db.product.count({ where: { businessId, deletedAt: null } }),
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
    const product = await this.db.product.findUnique({ where: { id, deletedAt: null } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, data: any) {
    return this.db.product.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.db.product.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
