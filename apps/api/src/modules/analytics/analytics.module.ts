import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsSummaryService } from './analytics-summary.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsV2Service } from './analytics-v2.service';
import { AnalyticsV2Controller } from './analytics-v2.controller';
import { AnalyticsRollupService } from './analytics-rollup.service';

@Module({
  controllers: [AnalyticsController, AnalyticsV2Controller],
  providers: [AnalyticsService, AnalyticsSummaryService, AnalyticsV2Service, AnalyticsRollupService],
  exports: [AnalyticsService, AnalyticsSummaryService, AnalyticsV2Service, AnalyticsRollupService],
})
export class AnalyticsModule {}
