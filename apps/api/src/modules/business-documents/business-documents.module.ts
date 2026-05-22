import { Module } from '@nestjs/common';
import { BusinessDocumentsController } from './business-documents.controller';
import { BusinessDocumentsService } from './business-documents.service';
import { MediaModule } from '../media/media.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [MediaModule, AuditModule],
  controllers: [BusinessDocumentsController],
  providers: [BusinessDocumentsService],
  exports: [BusinessDocumentsService],
})
export class BusinessDocumentsModule {}
