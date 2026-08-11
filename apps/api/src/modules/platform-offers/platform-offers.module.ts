import { Module } from '@nestjs/common';
import { PlatformOffersService } from './platform-offers.service';
import { PlatformOffersController } from './platform-offers.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [PlatformOffersController],
  providers: [PlatformOffersService],
  exports: [PlatformOffersService],
})
export class PlatformOffersModule {}
