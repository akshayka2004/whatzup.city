import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OcrService } from './ocr.service';
import { OcrProcessor } from './ocr.processor';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ocr-queue',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    }),
    AuditModule,
  ],
  providers: [OcrService, OcrProcessor],
  exports: [OcrService, BullModule],
})
export class OcrModule {}
