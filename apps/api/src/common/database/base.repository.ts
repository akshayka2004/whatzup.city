import { DatabaseService } from './database.service';
import { PaginatedResult, PaginationParamsDto } from './pagination';
import { NotFoundException } from '@nestjs/common';

export abstract class BaseRepository<T, TCreateInput = any, TUpdateInput = any> {
  constructor(
    protected readonly db: DatabaseService,
    protected readonly modelName: string,
  ) {}

  protected get model() {
    return (this.db as any)[this.modelName];
  }

  /**
   * Safe check for tenant-based isolation and soft-delete filters.
   */
  protected buildWhere(tenantId: string, criteria: any = {}, includeDeleted = false): any {
    const where: any = {
      ...criteria,
      tenantId,
    };
    if (!includeDeleted) {
      where.deletedAt = null;
    }
    return where;
  }

  /**
   * Find a single record by its ID, enforcing tenantId.
   */
  async findOne(
    tenantId: string,
    id: string,
    options?: { includeDeleted?: boolean; include?: any; select?: any },
  ): Promise<T | null> {
    const where = this.buildWhere(tenantId, { id }, options?.includeDeleted);
    const result = await this.model.findFirst({
      where,
      include: options?.include,
      select: options?.select,
    });
    return result;
  }

  /**
   * Find a list of records with offset-based pagination and filter criteria, enforcing tenantId.
   */
  async findMany(
    tenantId: string,
    criteria: any = {},
    pagination?: PaginationParamsDto,
    options?: { includeDeleted?: boolean; include?: any; select?: any },
  ): Promise<PaginatedResult<T>> {
    const where = this.buildWhere(tenantId, criteria, options?.includeDeleted);
    const limit = pagination?.limit || 20;
    const page = pagination?.page || 1;
    const skip = (page - 1) * limit;

    const orderBy: any = {};
    if (pagination?.sortBy) {
      orderBy[pagination.sortBy] = pagination.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: options?.include,
        select: options?.select,
      }),
      this.model.count({ where }),
    ]);

    return PaginatedResult.create(data, total, page, limit);
  }

  /**
   * Create a record, ensuring the tenantId is bound.
   */
  async create(tenantId: string, data: TCreateInput): Promise<T> {
    return this.model.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  /**
   * Update a record, validating that it exists and belongs to the correct tenant.
   */
  async update(tenantId: string, id: string, data: TUpdateInput): Promise<T> {
    const record = await this.findOne(tenantId, id);
    if (!record) {
      throw new NotFoundException(`Record not found or access denied for ID: ${id}`);
    }

    return this.model.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft-delete a record by setting its deletedAt timestamp.
   */
  async softDelete(tenantId: string, id: string): Promise<T> {
    const record = await this.findOne(tenantId, id);
    if (!record) {
      throw new NotFoundException(`Record not found or access denied for ID: ${id}`);
    }

    return this.model.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Restore a soft-deleted record.
   */
  async restore(tenantId: string, id: string): Promise<T> {
    const record = await this.findOne(tenantId, id, { includeDeleted: true });
    if (!record) {
      throw new NotFoundException(`Record not found or access denied for ID: ${id}`);
    }

    return this.model.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  /**
   * Permanently hard-delete a record.
   */
  async hardDelete(tenantId: string, id: string): Promise<T> {
    const record = await this.findOne(tenantId, id, { includeDeleted: true });
    if (!record) {
      throw new NotFoundException(`Record not found or access denied for ID: ${id}`);
    }

    return this.model.delete({
      where: { id },
    });
  }

  /**
   * Count matching records, enforcing tenantId.
   */
  async count(tenantId: string, criteria: any = {}, includeDeleted = false): Promise<number> {
    const where = this.buildWhere(tenantId, criteria, includeDeleted);
    return this.model.count({ where });
  }
}
