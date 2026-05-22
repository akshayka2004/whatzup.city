import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { DatabaseService } from '../database.service';

@Injectable()
export class BranchRepository extends BaseRepository<any> {
  constructor(db: DatabaseService) {
    super(db, 'businessBranch');
  }

  /**
   * Find branches by business
   */
  async findByBusiness(tenantId: string, businessId: string): Promise<any[]> {
    return this.model.findMany({
      where: this.buildWhere(tenantId, { businessId }),
      orderBy: { name: 'asc' },
    });
  }
}
