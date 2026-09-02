import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@saas/types';
import { PlatformVouchersService } from './platform-vouchers.service';
import {
  CreatePlatformVoucherDto, UpdatePlatformVoucherDto, RedeemPlatformVoucherDto,
} from './dto/platform-voucher.dto';

@ApiTags('Platform Vouchers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('platform-vouchers')
export class PlatformVouchersController {
  constructor(private readonly platformVouchers: PlatformVouchersService) {}

  // ── CUSTOMER ───────────────────────────────────────────────────────────
  @Get('available')
  @ApiOperation({ summary: "Platform reward tiers with the viewer's points progress" })
  available(@CurrentUser('id') userId: string) {
    return this.platformVouchers.available(userId);
  }

  @Get('my')
  @ApiOperation({ summary: 'My unlocked platform vouchers (wallet)' })
  my(@CurrentUser('id') userId: string) {
    return this.platformVouchers.myVouchers(userId);
  }

  @Post(':id/unlock')
  @ApiOperation({ summary: 'Unlock a platform voucher once the points threshold is met' })
  unlock(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.platformVouchers.unlock(userId, id);
  }

  // ── BUSINESS STAFF ─────────────────────────────────────────────────────
  @Post('redeem')
  @ApiOperation({ summary: 'Redeem a customer platform-voucher code in-store (any business staff)' })
  redeem(
    @CurrentUser('id') userId: string,
    @CurrentUser('businessId') businessId: string,
    @Body() dto: RedeemPlatformVoucherDto,
  ) {
    return this.platformVouchers.redeem(userId, businessId, dto.code);
  }

  @Get('business/redemptions')
  @ApiOperation({ summary: 'Platform vouchers redeemed at my business' })
  businessRedemptions(@CurrentUser('businessId') businessId: string) {
    return this.platformVouchers.businessRedemptions(businessId);
  }

  // ── SUPER-ADMIN: CRUD ──────────────────────────────────────────────────
  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all platform reward tiers (Admin only)' })
  listForAdmin() {
    return this.platformVouchers.listForAdmin();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a platform reward tier (Admin only)' })
  create(
    @CurrentUser('id') adminId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreatePlatformVoucherDto,
  ) {
    return this.platformVouchers.create(adminId, tenantId, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a platform reward tier (Admin only)' })
  update(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePlatformVoucherDto,
  ) {
    return this.platformVouchers.update(id, adminId, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a platform reward tier (Admin only)' })
  remove(@Param('id') id: string) {
    return this.platformVouchers.remove(id);
  }
}
