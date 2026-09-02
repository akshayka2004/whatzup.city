import { Module } from '@nestjs/common';
import { PlatformVouchersController } from './platform-vouchers.controller';
import { PlatformVouchersService } from './platform-vouchers.service';

@Module({
  controllers: [PlatformVouchersController],
  providers: [PlatformVouchersService],
  exports: [PlatformVouchersService],
})
export class PlatformVouchersModule {}
