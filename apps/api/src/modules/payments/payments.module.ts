import { Module } from '@nestjs/common';
import { BusinessPaymentsController, PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AuditModule } from '../audit/audit.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [AuditModule, SubscriptionsModule],
  controllers: [PaymentsController, BusinessPaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
