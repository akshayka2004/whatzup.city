import { Module } from '@nestjs/common';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { AuditModule } from '../audit/audit.module';
import { PasswordService } from '../auth/password.service';

@Module({
  imports: [AuditModule],
  controllers: [TeamController],
  providers: [TeamService, PasswordService],
  exports: [TeamService],
})
export class TeamModule {}
