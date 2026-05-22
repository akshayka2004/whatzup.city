import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { DeviceLoginRepository } from '../../common/database/repositories/device-login.repository';

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum NotificationType {
  OFFER_ALERT = 'OFFER_ALERT',
  REVIEW_REPLY = 'REVIEW_REPLY',
  VERIFIED_PURCHASE = 'VERIFIED_PURCHASE',
  MODERATION_UPDATE = 'MODERATION_UPDATE',
  GOVERNMENT_ALERT = 'GOVERNMENT_ALERT',
  CAMPAIGN = 'CAMPAIGN',
  SYSTEM = 'SYSTEM',
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly deviceLoginRepo: DeviceLoginRepository,
    @InjectQueue('notification-queue') private readonly notificationQueue: Queue,
  ) {}

  /**
   * Create and dispatch a notification. CRITICAL bypasses batching.
   */
  async send(data: {
    tenantId: string;
    userId: string;
    title: string;
    body: string;
    type: string;
    channel?: string;
    priority?: NotificationPriority;
    metadata?: any;
  }) {
    const priority = data.priority || NotificationPriority.NORMAL;

    // Persist to DB
    const notification = await this.db.notification.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        title: data.title,
        body: data.body,
        type: data.type,
        channel: data.channel || 'IN_APP',
        metadata: { ...data.metadata, priority },
      },
    });

    // Invalidate unread count cache
    await this.redis.del(`unread:${data.tenantId}:${data.userId}`);

    // Dispatch push delivery via queue
    if (priority === NotificationPriority.CRITICAL) {
      // Critical: immediate processing, no delay
      await this.notificationQueue.add(
        'push-deliver',
        {
          notificationId: notification.id,
          tenantId: data.tenantId,
          userId: data.userId,
          title: data.title,
          body: data.body,
          type: data.type,
          priority,
        },
        { priority: 1 },
      ); // BullMQ priority 1 = highest
    } else {
      await this.notificationQueue.add('push-deliver', {
        notificationId: notification.id,
        tenantId: data.tenantId,
        userId: data.userId,
        title: data.title,
        body: data.body,
        type: data.type,
        priority,
      });
    }

    return notification;
  }

  /**
   * Send to multiple users (broadcasts)
   */
  async sendBulk(data: {
    tenantId: string;
    userIds: string[];
    title: string;
    body: string;
    type: string;
    priority?: NotificationPriority;
    metadata?: any;
  }) {
    const notifications = await Promise.all(
      data.userIds.map((userId) => this.send({ ...data, userId })),
    );
    return { sent: notifications.length };
  }

  /**
   * Get notification feed with cached unread count
   */
  async findByUser(tenantId: string, userId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.db.notification.findMany({
        where: { tenantId, userId, deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.notification.count({
        where: { tenantId, userId, deletedAt: null },
      }),
    ]);

    const unreadCount = await this.getUnreadCount(tenantId, userId);

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
      unreadCount,
    };
  }

  /**
   * Cached unread count
   */
  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    const cacheKey = `unread:${tenantId}:${userId}`;
    const cached = await this.redis.get<number>(cacheKey);
    if (cached !== null) return cached;

    const count = await this.db.notification.count({
      where: { tenantId, userId, isRead: false, deletedAt: null },
    });

    await this.redis.set(cacheKey, count, 300); // 5 min TTL
    return count;
  }

  async markAsRead(tenantId: string, userId: string, id: string) {
    const notification = await this.db.notification.findFirst({
      where: { id, tenantId, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    await this.db.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
    await this.redis.del(`unread:${tenantId}:${userId}`);
    return { success: true };
  }

  async markAllAsRead(tenantId: string, userId: string) {
    await this.db.notification.updateMany({
      where: { tenantId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    await this.redis.set(`unread:${tenantId}:${userId}`, 0, 300);
    return { success: true };
  }

  async registerDeviceToken(
    tenantId: string,
    userId: string,
    data: {
      deviceToken: string;
      deviceType: string;
      os?: string;
      browser?: string;
      ipAddress?: string;
    },
  ) {
    return this.deviceLoginRepo.registerDevice(tenantId, userId, data);
  }

  async deregisterDeviceToken(tenantId: string, deviceToken: string) {
    await this.deviceLoginRepo.removeDeviceToken(tenantId, deviceToken);
    return { success: true };
  }
}
