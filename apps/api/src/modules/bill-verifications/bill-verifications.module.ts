import { Module } from '@nestjs/common';
import { BillVerificationsController } from './bill-verifications.controller';
import { BillVerificationsService } from './bill-verifications.service';
import { FraudModule } from '../fraud/fraud.module';
import { AuditModule } from '../audit/audit.module';
import { VerifiedPurchasesModule } from '../verified-purchases/verified-purchases.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { BrandsModule } from '../brands/brands.module';

@Module({
  imports: [FraudModule, AuditModule, VerifiedPurchasesModule, NotificationsModule, AnalyticsModule, BrandsModule],
  controllers: [BillVerificationsController],
  providers: [BillVerificationsService],
})
export class BillVerificationsModule {}
