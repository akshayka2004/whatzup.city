import { Module } from '@nestjs/common';
import { EntityOnboardingController } from './entity-onboarding.controller';
import { EntityOnboardingService } from './entity-onboarding.service';
import { AuditModule } from '../audit/audit.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    AuditModule,
    MediaModule,
  ],
  controllers: [EntityOnboardingController],
  providers: [EntityOnboardingService],
  exports: [EntityOnboardingService],
})
export class EntityOnboardingModule {}
