import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TrialsController } from './trials.controller';
import { TrialsService } from './trials.service';
import { TrialNotificationProcessor } from './trial-notification.processor';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    NotificationsModule,
    BullModule.registerQueue({
      name: 'trial-queue',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
  ],
  controllers: [TrialsController],
  providers: [TrialsService, TrialNotificationProcessor],
  exports: [TrialsService],
})
export class TrialsModule {}
