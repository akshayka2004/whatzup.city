import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { DatabaseService } from '../database.service';
import { PaginationParamsDto } from '../pagination';

@Injectable()
export class BillRepository extends BaseRepository<any> {
  constructor(db: DatabaseService) {
    super(db, 'bill');
  }

  async findUserBills(tenantId: string, userId: string, pagination?: PaginationParamsDto) {
    return this.findMany(tenantId, { userId }, pagination, {
      include: {
        business: { select: { id: true, name: true } },
      },
    });
  }

  async verifyBill(
    tenantId: string,
    id: string,
    status: 'APPROVED' | 'REJECTED',
    verifiedBy: string,
    rejectionReason?: string,
  ): Promise<any> {
    return this.update(tenantId, id, {
      status,
      verifiedBy,
      verifiedAt: new Date(),
      rejectionReason,
    });
  }
}
