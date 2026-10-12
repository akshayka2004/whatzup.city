import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { EntitlementsService } from './entitlements.service';
import { PlanEnforcementService } from './plan-enforcement.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, EntitlementsService, PlanEnforcementService],
  exports: [SubscriptionsService, EntitlementsService, PlanEnforcementService],
})
export class SubscriptionsModule {}
