import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsSummaryService } from './analytics-summary.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsSummaryService],
  exports: [AnalyticsService, AnalyticsSummaryService],
})
export class AnalyticsModule {}
