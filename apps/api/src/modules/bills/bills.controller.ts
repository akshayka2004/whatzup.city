import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BillsService } from './bills.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@saas/types';

@ApiTags('Bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bills')
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Post()
  async upload(@CurrentUser('id') userId: string, @Body() data: any) {
    return this.billsService.upload(userId, data);
  }

  @Get('mine')
  async findMine(@CurrentUser('id') userId: string, @Query('page') page?: number) {
    return this.billsService.findByUser(userId, page);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.ADMIN)
  @Get('pending')
  async findPending(@Query('page') page?: number) {
    return this.billsService.findPendingVerification(page);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.ADMIN)
  @Patch(':id/verify')
  async verify(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.billsService.verify(id, userId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.ADMIN)
  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason: string,
  ) {
    return this.billsService.reject(id, userId, reason);
  }
}
