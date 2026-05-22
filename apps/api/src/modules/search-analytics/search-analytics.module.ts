import { Module } from '@nestjs/common';
import { SearchAnalyticsController } from './search-analytics.controller';
import { SearchAnalyticsService } from './search-analytics.service';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [SearchAnalyticsController],
  providers: [SearchAnalyticsService],
  exports: [SearchAnalyticsService],
})
export class SearchAnalyticsModule {}
