import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { DatabaseService } from '../database.service';

@Injectable()
export class VerifiedPurchaseRepository extends BaseRepository<any> {
  constructor(db: DatabaseService) {
    super(db, 'verifiedPurchase');
  }

  async findByBillId(tenantId: string, billId: string): Promise<any> {
    return this.model.findUnique({
      where: this.buildWhere(tenantId, { billId }),
    });
  }

  async checkEligibility(tenantId: string, userId: string, businessId: string): Promise<boolean> {
    const purchase = await this.model.findFirst({
      where: this.buildWhere(tenantId, { userId, businessId }),
    });
    return !!purchase;
  }
}
