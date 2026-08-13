import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlatformOffersService } from './platform-offers.service';
import {
  CreatePlatformOfferDto, UpdatePlatformOfferDto, SetPlatformOfferStatusDto,
} from './dto/platform-offer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@saas/types';

@ApiTags('Platform Offers')
@Controller('platform-offers')
export class PlatformOffersController {
  constructor(private readonly service: PlatformOffersService) {}

  // ── Public ───────────────────────────────────────────────────────
  // Literal segments are declared before ':id' so they aren't swallowed by the
  // param route (a P2023 invalid-UUID error otherwise).

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'List published platform offers' })
  async listPublic(
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
  ) {
    return this.service.listPublic(tenantId, category);
  }

  @Public()
  @Post(':id/click')
  @ApiOperation({ summary: 'Track a deduped detail-view click on a platform offer' })
  async trackClick(
    @Query('tenantId') tenantId: string = 'default',
    @Param('id') id: string,
    @Body() body: { actorKey?: string },
  ) {
    const actorKey = (body?.actorKey || '').trim().slice(0, 120);
    if (!actorKey) return { ok: false };
    await this.service.trackClick(tenantId, id, actorKey);
    return { ok: true };
  }

  // ── Admin ────────────────────────────────────────────────────────

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all platform offers (Admin only)' })
  async listForAdmin(
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listForAdmin(category, status);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a platform offer (Admin only)' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePlatformOfferDto,
  ) {
    return this.service.create(tenantId, userId, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish or unpublish a platform offer (Admin only)' })
  async setStatus(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: SetPlatformOfferStatusDto,
  ) {
    return this.service.setStatus(tenantId, userId, id, dto.status);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a platform offer (Admin only)' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePlatformOfferDto,
  ) {
    return this.service.update(tenantId, userId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a platform offer (Admin only)' })
  async remove(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(tenantId, userId, id);
  }
}
