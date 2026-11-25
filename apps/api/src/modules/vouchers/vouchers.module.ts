import { Module } from '@nestjs/common';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';
import { RewardInsightsService } from './reward-insights.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { RewardsModule } from '../rewards/rewards.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [SubscriptionsModule, RewardsModule, AuditModule, NotificationsModule],
  controllers: [VouchersController],
  providers: [VouchersService, RewardInsightsService],
  exports: [VouchersService],
})
export class VouchersModule {}
