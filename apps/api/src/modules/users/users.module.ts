import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PasswordService } from '../auth/password.service';
import { StaffAccountsController } from './staff-accounts.controller';
import { StaffAccountsService } from './staff-accounts.service';

@Module({
  imports: [],
  controllers: [UsersController, StaffAccountsController],
  providers: [UsersService, StaffAccountsService, PasswordService],
  exports: [UsersService],
})
export class UsersModule {}
