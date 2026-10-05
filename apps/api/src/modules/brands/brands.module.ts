import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SearchModule } from '../search/search.module';
import { BrandScopeService } from './brand-scope.service';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';

@Module({
  imports: [AuditModule, SearchModule],
  controllers: [BrandsController],
  providers: [BrandScopeService, BrandsService],
  exports: [BrandScopeService, BrandsService],
})
export class BrandsModule {}
