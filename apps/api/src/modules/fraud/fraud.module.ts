import { Module } from '@nestjs/common';
import { FraudService } from './fraud.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [FraudService],
  exports: [FraudService],
})
export class FraudModule {}
