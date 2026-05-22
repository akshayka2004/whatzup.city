import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ocr-queue',
    }),
    AuditModule,
  ],
  controllers: [BillsController],
  providers: [BillsService],
})
export class BillsModule {}
