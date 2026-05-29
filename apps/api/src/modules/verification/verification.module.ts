import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { AuditModule } from '../audit/audit.module';
import { TrialsModule } from '../trials/trials.module';

@Module({
  imports: [AuditModule, TrialsModule],
  controllers: [VerificationController],
  providers: [VerificationService],
})
export class VerificationModule {}
