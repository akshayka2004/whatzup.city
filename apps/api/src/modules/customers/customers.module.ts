import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { BusinessCustomerService } from './business-customer.service';
import { BusinessCustomerController } from './business-customer.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [CustomersController, BusinessCustomerController],
  providers: [CustomersService, BusinessCustomerService],
  exports: [CustomersService, BusinessCustomerService],
})
export class CustomersModule {}
