import { Module } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { AuditModule } from '../audit/audit.module';
import { PasswordService } from '../auth/password.service';

@Module({
  imports: [AuditModule],
  controllers: [BranchesController],
  providers: [BranchesService, PasswordService],
  exports: [BranchesService],
})
export class BranchesModule {}
