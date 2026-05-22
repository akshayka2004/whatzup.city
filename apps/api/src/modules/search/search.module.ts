// Search Module — Abstraction layer compatible with Typesense/Elasticsearch
import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchProcessor } from './search.processor';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [
    RedisModule,
    BullModule.registerQueue({
      name: 'search-queue',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    }),
  ],
  controllers: [SearchController],
  providers: [SearchService, SearchProcessor],
  exports: [SearchService],
})
export class SearchModule {}
