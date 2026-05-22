import { Module } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { BusinessesController } from './businesses.controller';
import { SearchModule } from '../search/search.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [SearchModule, AuditModule],
  controllers: [BusinessesController],
  providers: [BusinessesService],
  exports: [BusinessesService],
})
export class BusinessesModule {}
