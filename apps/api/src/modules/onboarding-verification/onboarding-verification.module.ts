import { Module } from '@nestjs/common';
import { OnboardingVerificationController } from './onboarding-verification.controller';
import { OnboardingVerificationService } from './onboarding-verification.service';
import { SearchModule } from '../search/search.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [SearchModule, AuditModule, NotificationsModule],
  controllers: [OnboardingVerificationController],
  providers: [OnboardingVerificationService],
  exports: [OnboardingVerificationService],
})
export class OnboardingVerificationModule {}
