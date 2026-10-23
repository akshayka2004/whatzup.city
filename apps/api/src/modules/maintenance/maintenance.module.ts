import { Module } from '@nestjs/common';
import { RetentionService } from './retention.service';
import { ClientErrorsController } from './client-errors.controller';

@Module({
  controllers: [ClientErrorsController],
  providers: [RetentionService],
  exports: [RetentionService],
})
export class MaintenanceModule {}
