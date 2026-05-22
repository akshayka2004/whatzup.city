import { Module } from '@nestjs/common';
import { VerifiedPurchasesService } from './verified-purchases.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [VerifiedPurchasesService],
  exports: [VerifiedPurchasesService],
})
export class VerifiedPurchasesModule {}
