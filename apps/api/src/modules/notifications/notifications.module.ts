import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationProcessor } from './notification.processor';
import { FcmService } from './fcm.service';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [
    RedisModule,
    BullModule.registerQueue({
      name: 'notification-queue',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationProcessor, FcmService],
  exports: [NotificationsService, FcmService],
})
export class NotificationsModule {}
