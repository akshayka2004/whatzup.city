import { Module } from '@nestjs/common';
import { CustomerOnboardingController } from './customer-onboarding.controller';
import { CustomerOnboardingService } from './customer-onboarding.service';
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
  controllers: [CustomerOnboardingController],
  providers: [CustomerOnboardingService],
  exports: [CustomerOnboardingService],
})
export class CustomerOnboardingModule {}
