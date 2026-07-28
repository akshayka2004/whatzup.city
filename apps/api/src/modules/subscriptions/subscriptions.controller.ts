import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { AssignPackageDto, AssignHotelPackageDto } from './dto/subscription.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@saas/types';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('packages')
  @ApiOperation({ summary: 'List all subscription package tiers' })
  async getPackages() {
    return this.subscriptionsService.getPackages();
  }

  @Post('businesses/:businessId/assign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign package subscription status to a business' })
  async assign(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('businessId') businessId: string,
    @Body() dto: AssignPackageDto,
  ) {
    return this.subscriptionsService.assignPackage(userId, tenantId, businessId, dto);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all subscriptions with latest payment (Admin only)' })
  async listAll() {
    return this.subscriptionsService.listAllForAdmin();
  }

  @Post('businesses/:businessId/assign-hotel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign hotel star-classification pricing to a business (Hotel category only)' })
  async assignHotel(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('businessId') businessId: string,
    @Body() dto: AssignHotelPackageDto,
  ) {
    return this.subscriptionsService.assignHotelPackage(userId, tenantId, businessId, dto);
  }

  @Get('businesses/:businessId/active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current active subscription of business' })
  async getActive(
    @CurrentUser('tenantId') tenantId: string,
    @Param('businessId') businessId: string,
  ) {
    return this.subscriptionsService.getActive(tenantId, businessId);
  }
}
