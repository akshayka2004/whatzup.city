import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@saas/types';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto, RedeemSpinDto } from './dto/discount.dto';

// Same login-required convention as Vouchers: the lucky wheel is a logged-in
// perk, not a public one — the business profile only shows it to signed-in visitors.
@ApiTags('Discounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discounts: DiscountsService) {}

  // ── OWNER ──────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Publish a discount wheel campaign (business owner)' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateDiscountDto) {
    return this.discounts.create(userId, dto.businessId, dto);
  }

  @Get('mine/:businessId')
  @ApiOperation({ summary: "Owner's discount campaigns for a business" })
  mine(@CurrentUser('id') userId: string, @Param('businessId') businessId: string) {
    return this.discounts.listMine(userId, businessId);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Retire a discount campaign (owner)' })
  deactivate(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.discounts.deactivate(userId, id);
  }

  @Post('redeem')
  @ApiOperation({ summary: "Redeem a customer's spin ticket in-store (owner)" })
  redeem(@CurrentUser('id') userId: string, @Body() dto: RedeemSpinDto) {
    return this.discounts.redeem(userId, dto.businessId, dto.code);
  }

  // ── CUSTOMER ───────────────────────────────────────────────────────────

  @Get('business/:businessId/active')
  @ApiOperation({ summary: "A business's active discount wheel, plus the viewer's own ticket if they already spun" })
  active(@CurrentUser('id') userId: string, @Param('businessId') businessId: string) {
    return this.discounts.getActive(businessId, userId);
  }

  @Get('active/all')
  @ApiOperation({ summary: 'Every business with a live discount wheel (public "Spin it" discovery page)' })
  activeAll() {
    return this.discounts.listAllActive();
  }

  @Post(':id/spin')
  @ApiOperation({ summary: 'Spin the wheel once for a discount campaign' })
  spin(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.discounts.spin(userId, id);
  }

  @Get('my')
  @ApiOperation({ summary: 'My spin tickets (wallet), across every business' })
  my(@CurrentUser('id') userId: string) {
    return this.discounts.myTickets(userId);
  }

  // ── PLATFORM OVERSIGHT ───────────────────────────────────────────────────

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN, UserRole.PLATFORM_STAFF)
  @ApiOperation({ summary: 'All discount campaigns across tenants (admin Discounts section)' })
  adminAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.discounts.adminFindAll(page ? Number(page) : 1, limit ? Number(limit) : 25);
  }
}
