import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { RewardAudienceService } from './reward-audience.service';
import { RewardProgressService } from './reward-progress.service';
import { RewardSweepService } from './reward-sweep.service';

/** Shared reward logic: progress, audience matching and the hourly sweep. Imported by vouchers and verified purchases. */
@Module({
  imports: [NotificationsModule],
  providers: [RewardAudienceService, RewardProgressService, RewardSweepService],
  exports: [RewardAudienceService, RewardProgressService],
})
export class RewardsModule {}
