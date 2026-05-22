import { Module } from '@nestjs/common';
import { BusinessMediaController } from './business-media.controller';
import { BusinessMediaService } from './business-media.service';
import { MediaModule } from '../media/media.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [MediaModule, AuditModule],
  controllers: [BusinessMediaController],
  providers: [BusinessMediaService],
  exports: [BusinessMediaService],
})
export class BusinessMediaModule {}
