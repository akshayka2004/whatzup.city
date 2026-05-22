import { Module } from '@nestjs/common';
import { OnboardingAnalyticsController } from './onboarding-analytics.controller';
import { OnboardingAnalyticsService } from './onboarding-analytics.service';

@Module({
  controllers: [OnboardingAnalyticsController],
  providers: [OnboardingAnalyticsService],
  exports: [OnboardingAnalyticsService],
})
export class OnboardingAnalyticsModule {}
