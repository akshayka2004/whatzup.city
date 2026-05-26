import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { AuditModule } from '../audit/audit.module';
import { DatabaseService } from '../../common/database/database.service';

@Module({
  imports: [AuditModule],
  controllers: [ProductsController],
  providers: [ProductsService, DatabaseService],
  exports: [ProductsService],
})
export class ProductsModule {}
