import { Module } from '@nestjs/common';
import { BusinessPaymentsController, PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [PaymentsController, BusinessPaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
