import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MetricsService } from './metrics.service';
import { MetricsProcessor } from './metrics.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'metrics-queue',
    }),
  ],
  providers: [MetricsService, MetricsProcessor],
  exports: [MetricsService, BullModule],
})
export class MetricsModule {}
