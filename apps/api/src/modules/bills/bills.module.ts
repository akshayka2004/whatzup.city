import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { AuditModule } from '../audit/audit.module';
import { CustomersModule } from '../customers/customers.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ocr-queue',
    }),
    AuditModule,
    CustomersModule,
    AnalyticsModule,
  ],
  controllers: [BillsController],
  providers: [BillsService],
})
export class BillsModule {}
