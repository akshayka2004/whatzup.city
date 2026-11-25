import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RewardsModule } from '../rewards/rewards.module';
import { QuickBillsController } from './quick-bills.controller';
import { QuickBillsService } from './quick-bills.service';

@Module({
  imports: [AuditModule, NotificationsModule, RewardsModule],
  controllers: [QuickBillsController],
  providers: [QuickBillsService],
})
export class QuickBillsModule {}
