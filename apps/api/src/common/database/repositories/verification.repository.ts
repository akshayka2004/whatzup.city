import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { DatabaseService } from '../database.service';

@Injectable()
export class VerificationRepository extends BaseRepository<any> {
  constructor(db: DatabaseService) {
    super(db, 'businessVerification');
  }

  /**
   * Find verification logs by business
   */
  async findByBusiness(tenantId: string, businessId: string): Promise<any[]> {
    return this.model.findMany({
      where: this.buildWhere(tenantId, { businessId }),
      orderBy: { createdAt: 'desc' },
      include: {
        verifier: { select: { id: true, name: true, email: true } },
      },
    });
  }
}
