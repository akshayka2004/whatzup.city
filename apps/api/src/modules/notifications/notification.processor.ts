import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { FcmService } from './fcm.service';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';

@Processor('notification-queue', { concurrency: 5 })
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly fcmService: FcmService,
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { tenantId, userId, title, body, type, priority } = job.data;
    this.logger.log(`Delivering push [${priority}] to user: ${userId}`);

    try {
      // Lookup user device tokens — cached for 60 s to avoid repeated DB hits
      const tokenCacheKey = `device-tokens:${tenantId}:${userId}`;
      let tokens: string[] | null = await this.redis.get<string[]>(tokenCacheKey);

      if (!tokens) {
        const logins = await this.db.deviceLogin.findMany({
          where: { userId, tenantId, deletedAt: null },
          select: { deviceToken: true },
        });
        tokens = logins
          .map((login) => login.deviceToken)
          .filter((token): token is string => !!token);
        await this.redis.set(tokenCacheKey, tokens, 60);
      }

      if (tokens.length === 0) {
        this.logger.debug(`No device tokens for user ${userId}, skipping push`);
        return { delivered: false, reason: 'NO_TOKENS' };
      }

      const result = await this.fcmService.sendToMultipleDevices(tokens, {
        title,
        body,
        data: { type, tenantId },
      });

      this.logger.log(
        `Push delivered: ${result.successCount}/${tokens.length} succeeded for user ${userId}`,
      );

      return {
        delivered: result.successCount > 0,
        successCount: result.successCount,
        failureCount: result.failureCount,
      };
    } catch (error) {
      this.logger.error(`Push delivery failed for user ${userId}: ${error.message}`);
      throw error; // Triggers BullMQ retry
    }
  }
}
