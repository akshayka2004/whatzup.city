import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DatabaseService) {}

  async send(
    userId: string,
    data: { title: string; body: string; type: string; channel: string; metadata?: any },
  ) {
    return this.db.notification.create({ data: { userId, ...data } });
  }

  async findByUser(userId: string, page = 1, limit = 20) {
    const [data, total, unread] = await Promise.all([
      this.db.notification.findMany({
        where: { userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.notification.count({ where: { userId } }),
      this.db.notification.count({ where: { userId, isRead: false } }),
    ]);
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      unreadCount: unread,
    };
  }

  async markAsRead(id: string) {
    return this.db.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }
  async markAllAsRead(userId: string) {
    return this.db.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
