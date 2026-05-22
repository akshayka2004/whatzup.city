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
}
