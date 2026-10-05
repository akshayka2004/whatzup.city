import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@saas/types';
import { BrandsService } from './brands.service';
import {
  AddOutletDto,
  BrandStatusDto,
  ConvertBrandDto,
  PromptResponseDto,
  UpdateBrandDto,
  UpdateOutletDto,
} from './dto/brand.dto';

@ApiTags('Brands')
@Controller()
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  // ── PUBLIC ───────────────────────────────────────────────────────────────

  @Public()
  @Get('brands/:brandId/outlets/public')
  @ApiOperation({ summary: "A brand's approved outlets (public 'Other outlets' list)" })
  publicOutlets(@Param('brandId', ParseUUIDPipe) brandId: string) {
    return this.brands.listPublicOutlets(brandId);
  }

  // ── BRAND OWNER ──────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('brands/mine')
  @ApiOperation({ summary: "The signed-in owner's brand and its outlets (null for a single business)" })
  mine(@CurrentUser('id') userId: string) {
    return this.brands.getMine(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('brands/convert')
  @ApiOperation({ summary: 'Convert an existing business into a brand account' })
  convert(@CurrentUser('id') userId: string, @Body() dto: ConvertBrandDto) {
    return this.brands.convert(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('brands/prompt-response')
  @ApiOperation({ summary: "Answer the 'convert to a brand account?' prompt: snooze or decline" })
  promptResponse(@CurrentUser('id') userId: string, @Body() dto: PromptResponseDto) {
    return this.brands.promptResponse(userId, dto.businessId, dto.response);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('brands/:brandId')
  @ApiOperation({ summary: 'Rename the brand or change its bill series' })
  update(
    @CurrentUser('id') userId: string,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Body() dto: UpdateBrandDto,
  ) {
    return this.brands.update(userId, brandId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('brands/:brandId/summary')
  @ApiOperation({ summary: 'Per-outlet totals for the brand overview' })
  summary(@CurrentUser('id') userId: string, @Param('brandId', ParseUUIDPipe) brandId: string) {
    return this.brands.summary(userId, brandId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('brands/:brandId/events')
  @ApiOperation({ summary: "The brand's recent activity" })
  events(
    @CurrentUser('id') userId: string,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Query('limit') limit?: number,
  ) {
    return this.brands.listEvents(userId, brandId, limit);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('brands/:brandId/billing-defaults')
  @ApiOperation({ summary: "Head outlet's invoice details, to pre-fill a new outlet's invoice form" })
  billingDefaults(@CurrentUser('id') userId: string, @Param('brandId', ParseUUIDPipe) brandId: string) {
    return this.brands.billingDefaults(userId, brandId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('brands/:brandId/outlets')
  @ApiOperation({ summary: 'Add a new outlet (starts pending approval)' })
  addOutlet(
    @CurrentUser('id') userId: string,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Body() dto: AddOutletDto,
  ) {
    return this.brands.addOutlet(userId, brandId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('brands/:brandId/outlets/:businessId')
  @ApiOperation({ summary: "Rename an outlet's label" })
  updateOutlet(
    @CurrentUser('id') userId: string,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: UpdateOutletDto,
  ) {
    return this.brands.updateOutlet(userId, brandId, businessId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('brands/:brandId/outlets/:businessId')
  @ApiOperation({ summary: 'Remove a branch outlet (the head outlet cannot be removed)' })
  removeOutlet(
    @CurrentUser('id') userId: string,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Param('businessId', ParseUUIDPipe) businessId: string,
  ) {
    return this.brands.removeOutlet(userId, brandId, businessId);
  }

  // ── PLATFORM OVERSIGHT (super-admin) ─────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN, UserRole.PLATFORM_STAFF)
  @ApiBearerAuth()
  @Get('admin/brands')
  @ApiOperation({ summary: 'All brand accounts across tenants' })
  adminList(@Query('q') q?: string, @Query('status') status?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.brands.adminList({ q, status, page, limit });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN, UserRole.PLATFORM_STAFF)
  @ApiBearerAuth()
  @Get('admin/brand-events')
  @ApiOperation({ summary: 'Platform-wide brand activity feed' })
  adminEvents(
    @Query('brandId') brandId?: string,
    @Query('type') type?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.brands.adminEvents({ brandId, type, page, limit });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN, UserRole.PLATFORM_STAFF)
  @ApiBearerAuth()
  @Get('admin/brands/:brandId')
  @ApiOperation({ summary: 'One brand: outlets, bill series, activity timeline' })
  adminDetail(@Param('brandId', ParseUUIDPipe) brandId: string) {
    return this.brands.adminDetail(brandId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @Patch('admin/brands/:brandId/status')
  @ApiOperation({ summary: 'Suspend or reactivate a brand (suspended = no new outlets)' })
  adminSetStatus(
    @CurrentUser('id') adminId: string,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Body() dto: BrandStatusDto,
  ) {
    return this.brands.adminSetStatus(adminId, brandId, dto.status);
  }
}
