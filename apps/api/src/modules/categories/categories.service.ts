import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  async findAll(tenantId: string) {
    const cached = await this.redis.get(`categories:${tenantId}`);
    if (cached) return cached;
    const categories = await this.db.category.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { businesses: true } } },
    });
    await this.redis.set(`categories:${tenantId}`, categories, 3600);
    return categories;
  }

  async create(
    tenantId: string,
    data: { name: string; slug: string; description?: string; icon?: string; parentId?: string },
  ) {
    const cat = await this.db.category.create({ data: { tenantId, ...data } });
    await this.redis.del(`categories:${tenantId}`);
    return cat;
  }

  async update(id: string, tenantId: string, data: any) {
    const cat = await this.db.category.update({ where: { id }, data });
    await this.redis.del(`categories:${tenantId}`);
    return cat;
  }
}
