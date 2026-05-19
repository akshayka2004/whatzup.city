import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);
  private redisClient: Redis | null = null;

  constructor() {
    // Lazy connect Redis for queue worker
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.redisClient = new Redis(redisUrl);
      this.logger.log('Notification queue worker connected to Redis');
    } catch (e) {
      this.logger.error('Failed to connect to Redis for notification queue', e);
    }
  }

  async sendPushNotification(userId: string, title: string, body: string): Promise<void> {
    this.logger.log(`Dispatching notification to user ${userId}: [${title}] ${body}`);
    // Simulate push service dispatch (Firebase/APNS)
    await new Promise((resolve) => setTimeout(resolve, 300));
    this.logger.log(`Notification dispatched to user ${userId}`);
  }
}
