import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { DatabaseService } from '../database.service';

@Injectable()
export class ProductRepository extends BaseRepository<any> {
  constructor(db: DatabaseService) {
    super(db, 'product');
  }

  /**
   * Toggles product availability
   */
  async toggleAvailability(tenantId: string, id: string, isAvailable: boolean): Promise<any> {
    return this.update(tenantId, id, { isAvailable });
  }
}
