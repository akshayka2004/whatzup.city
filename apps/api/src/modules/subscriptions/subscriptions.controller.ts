import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { AssignPackageDto } from './dto/subscription.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
