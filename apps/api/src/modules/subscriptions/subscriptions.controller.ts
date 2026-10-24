import { Controller, Get, Post, Body, Param, UseGuards, Header } from '@nestjs/common';
import { PUBLIC_API_CACHE } from '../../common/http/cache-control';
import { PaymentsEnabledGuard } from '../../common/guards/payments-enabled.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { EntitlementsService } from './entitlements.service';
import { CATALOGUE, GST_PERCENT } from '@saas/types';
import {
  AssignPackageDto,
  AssignHotelPackageDto,
  AssignHomeChefPackageDto,
} from './dto/subscription.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@saas/types';
import { DatabaseService } from '../../common/database/database.service';
import { assertBusinessAccess, type AccessUser } from '../../common/utils/business-access';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly entitlements: EntitlementsService,
    private readonly db: DatabaseService,
  ) {}

  @Public()
  @UseGuards(PaymentsEnabledGuard)
  @Header('Cache-Control', PUBLIC_API_CACHE)
  @Get('catalogue')
  @ApiOperation({ summary: 'Current plans and add-ons with prices (ex-GST)' })
  catalogue() {
    return { gstPercent: GST_PERCENT, items: CATALOGUE };
  }

  @Get('businesses/:businessId/entitlements')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'What this business may have live right now, with usage' })
  async myEntitlements(
    @CurrentUser() user: { id: string; role?: string },
    @Param('businessId') businessId: string,
  ) {
    return this.entitlements.forUser(businessId, user);
  }

  @UseGuards(PaymentsEnabledGuard)
  @Get('packages')
  @ApiOperation({ summary: 'List all subscription package tiers' })
  async getPackages() {
    return this.subscriptionsService.getPackages();
  }

  @UseGuards(PaymentsEnabledGuard)
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

  @Public()
  @UseGuards(PaymentsEnabledGuard)
  @Get('launch-offer')
  @ApiOperation({ summary: 'Launch offer: slots used per category (public)' })
  async launchOfferStatus() {
    return this.subscriptionsService.getLaunchOfferStatus();
  }

  @UseGuards(PaymentsEnabledGuard)
  @Post('businesses/:businessId/claim-launch-offer')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reserve a launch-offer slot and queue its special-priced plan for payment',
  })
  async claimLaunchOffer(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('businessId') businessId: string,
  ) {
    return this.subscriptionsService.claimLaunchOffer(userId, tenantId, businessId);
  }

  @UseGuards(PaymentsEnabledGuard)
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all subscriptions with latest payment (Admin only)' })
  async listAll() {
    return this.subscriptionsService.listAllForAdmin();
  }

  @UseGuards(PaymentsEnabledGuard)
  @Post('businesses/:businessId/assign-hotel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Assign hotel star-classification pricing to a business (Hotel category only)',
  })
  async assignHotel(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('businessId') businessId: string,
    @Body() dto: AssignHotelPackageDto,
  ) {
    return this.subscriptionsService.assignHotelPackage(userId, tenantId, businessId, dto);
  }

  @UseGuards(PaymentsEnabledGuard)
  @Post('businesses/:businessId/assign-homechef')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Assign a Home Chef annual tier to a business (Home Chef subcategory only)',
  })
  async assignHomeChef(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('businessId') businessId: string,
    @Body() dto: AssignHomeChefPackageDto,
  ) {
    return this.subscriptionsService.assignHomeChefPackage(userId, tenantId, businessId, dto);
  }

  @UseGuards(PaymentsEnabledGuard)
  @Get('businesses/:businessId/active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current active subscription of business' })
  async getActive(
    @CurrentUser('tenantId') tenantId: string,
    @Param('businessId') businessId: string,
    @CurrentUser() user: AccessUser,
  ) {
    await assertBusinessAccess(this.db, businessId, user);
    return this.subscriptionsService.getActive(tenantId, businessId);
  }
}
