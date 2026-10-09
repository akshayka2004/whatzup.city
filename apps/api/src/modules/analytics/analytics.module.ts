import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsSummaryService } from './analytics-summary.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsV2Service } from './analytics-v2.service';
import { AnalyticsV2Controller } from './analytics-v2.controller';
import { AnalyticsRollupService } from './analytics-rollup.service';
import { WeeklyDigestService } from './weekly-digest.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AnalyticsController, AnalyticsV2Controller],
  providers: [
    AnalyticsService,
    AnalyticsSummaryService,
    AnalyticsV2Service,
    AnalyticsRollupService,
    WeeklyDigestService,
  ],
  exports: [AnalyticsService, AnalyticsSummaryService, AnalyticsV2Service, AnalyticsRollupService],
})
export class AnalyticsModule {}
