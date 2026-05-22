import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignProcessor } from './campaign.processor';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    NotificationsModule,
    AuditModule,
    BullModule.registerQueue({
      name: 'campaign-queue',
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 10000 },
        removeOnComplete: 50,
      },
    }),
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignProcessor],
})
export class CampaignsModule {}
