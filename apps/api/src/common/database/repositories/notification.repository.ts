import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { DatabaseService } from '../database.service';
import { PaginationParamsDto } from '../pagination';

@Injectable()
export class NotificationRepository extends BaseRepository<any> {
  constructor(db: DatabaseService) {
    super(db, 'notification');
  }

  async findUserNotifications(tenantId: string, userId: string, pagination?: PaginationParamsDto) {
    return this.findMany(tenantId, { userId }, pagination);
  }

  async markAsRead(tenantId: string, id: string): Promise<any> {
    return this.update(tenantId, id, { isRead: true, readAt: new Date() });
  }

  async markAllAsRead(tenantId: string, userId: string): Promise<any> {
    return this.model.updateMany({
      where: this.buildWhere(tenantId, { userId, isRead: false }),
      data: { isRead: true, readAt: new Date() },
    });
  }
}
