import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { AuditModule } from '../audit/audit.module';
import { CustomersModule } from '../customers/customers.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FraudModule } from '../fraud/fraud.module';
import { BrandsModule } from '../brands/brands.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ocr-queue',
    }),
    AuditModule,
    CustomersModule,
    AnalyticsModule,
    NotificationsModule,
    FraudModule,
    BrandsModule,
  ],
  controllers: [BillsController],
  providers: [BillsService],
})
export class BillsModule {}
