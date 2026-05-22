import { Module } from '@nestjs/common';
import { BusinessIntelligenceService } from './bi.service';
import { BusinessIntelligenceController } from './bi.controller';

@Module({
  controllers: [BusinessIntelligenceController],
  providers: [BusinessIntelligenceService],
  exports: [BusinessIntelligenceService],
})
export class BusinessIntelligenceModule {}
