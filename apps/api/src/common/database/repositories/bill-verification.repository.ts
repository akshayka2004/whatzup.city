import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { DatabaseService } from '../database.service';

@Injectable()
export class BillVerificationRepository extends BaseRepository<any> {
  constructor(db: DatabaseService) {
    super(db, 'billVerification');
  }

  async findByBillId(tenantId: string, billId: string): Promise<any> {
    return this.model.findFirst({
      where: this.buildWhere(tenantId, { billId }),
    });
  }

  /**
   * Cross-tenant lookup by primary key. Bills are uploaded under the customer's
   * tenant but moderated by the business owner (a different tenant), so the
   * business-facing flows must resolve by the globally-unique verification id
   * (authorization is enforced separately via businessId + role).
   */
  async findByIdUnsafe(id: string, include?: any): Promise<any> {
    return this.model.findFirst({
      where: { id, deletedAt: null },
      ...(include ? { include } : {}),
    });
  }

  /**
   * Business moderation queue — scoped by businessId (globally unique), NOT by
   * tenant, so the owner sees bills customers uploaded from any tenant.
   */
  async findManyByBusiness(
    businessId: string,
    criteria: any,
    pagination: { page: number; limit: number; sortBy: string; sortOrder: 'asc' | 'desc' },
    include?: any,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const where = { businessId, deletedAt: null, ...criteria };
    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
        ...(include ? { include } : {}),
      }),
      this.model.count({ where }),
    ]);
    return { data, total, page: pagination.page, limit: pagination.limit };
  }
}
