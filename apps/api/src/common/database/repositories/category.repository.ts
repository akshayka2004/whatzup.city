import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { DatabaseService } from '../database.service';

@Injectable()
export class CategoryRepository extends BaseRepository<any> {
  constructor(db: DatabaseService) {
    super(db, 'category');
  }

  /**
   * Retrieves active root categories with their nested children
   */
  async findHierarchical(tenantId: string): Promise<any[]> {
    return this.model.findMany({
      where: this.buildWhere(tenantId, { parentId: null, isActive: true }),
      include: {
        children: {
          where: { isActive: true, deletedAt: null },
          include: {
            children: {
              where: { isActive: true, deletedAt: null },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Find a category by slug in a tenant
   */
  async findBySlug(tenantId: string, slug: string): Promise<any | null> {
    return this.model.findFirst({
      where: this.buildWhere(tenantId, { slug }),
    });
  }
}
