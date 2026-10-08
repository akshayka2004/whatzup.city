import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsSummaryService } from './analytics-summary.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsV2Service } from './analytics-v2.service';
import { AnalyticsV2Controller } from './analytics-v2.controller';

@Module({
  controllers: [AnalyticsController, AnalyticsV2Controller],
  providers: [AnalyticsService, AnalyticsSummaryService, AnalyticsV2Service],
  exports: [AnalyticsService, AnalyticsSummaryService, AnalyticsV2Service],
})
export class AnalyticsModule {}
