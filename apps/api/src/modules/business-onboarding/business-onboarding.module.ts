import { Module } from '@nestjs/common';
import { BusinessOnboardingController } from './business-onboarding.controller';
import { BusinessOnboardingService } from './business-onboarding.service';
import { OnboardingProcessor } from './onboarding.processor';
import { BullModule } from '@nestjs/bullmq';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'onboarding-queue',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    }),
    AuditModule,
  ],
  controllers: [BusinessOnboardingController],
  providers: [BusinessOnboardingService, OnboardingProcessor],
  exports: [BusinessOnboardingService],
})
export class BusinessOnboardingModule {}
