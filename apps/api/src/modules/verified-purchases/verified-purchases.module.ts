import { Module } from '@nestjs/common';
import { VerifiedPurchasesService } from './verified-purchases.service';
import { AuditModule } from '../audit/audit.module';
import { RewardsModule } from '../rewards/rewards.module';

@Module({
  imports: [AuditModule, RewardsModule],
  providers: [VerifiedPurchasesService],
  exports: [VerifiedPurchasesService],
})
export class VerifiedPurchasesModule {}
