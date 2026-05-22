import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TrendingController } from './trending.controller';
import { TrendingService } from './trending.service';
import { TrendingProcessor } from './trending.processor';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [
    RedisModule,
    BullModule.registerQueue({
      name: 'trending-queue',
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 10000 },
      },
    }),
  ],
  controllers: [TrendingController],
  providers: [TrendingService, TrendingProcessor],
  exports: [TrendingService],
})
export class TrendingModule {}
