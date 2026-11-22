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
  Header,
} from '@nestjs/common';
import { PUBLIC_API_CACHE } from '../../common/http/cache-control';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlatformOffersService } from './platform-offers.service';
import { BuffetRsvpService } from './buffet-rsvp.service';
import {
  CreatePlatformOfferDto,
  UpdatePlatformOfferDto,
  SetPlatformOfferStatusDto,
  CreateBuffetRsvpDto,
  ReviewBuffetRsvpDto,
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
  constructor(
    private readonly service: PlatformOffersService,
    private readonly rsvps: BuffetRsvpService,
  ) {}

  // ── Public ───────────────────────────────────────────────────────
  // Literal segments are declared before ':id' so they aren't swallowed by the
  // param route (a P2023 invalid-UUID error otherwise).

  @Public()
  @Header('Cache-Control', PUBLIC_API_CACHE)
  @Get('public')
  @ApiOperation({ summary: 'List published platform offers' })
  async listPublic(@Query('tenantId') tenantId?: string, @Query('category') category?: string) {
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

  // ── Buffet RSVPs: any signed-in person (literal segments first) ──────

  @Get('rsvps/mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My buffet RSVPs' })
  myRsvps(@CurrentUser() user: { id: string; tenantId?: string }) {
    return this.rsvps.mine(user);
  }

  @Patch('rsvps/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel my buffet RSVP' })
  cancelRsvp(@CurrentUser() user: { id: string; tenantId?: string }, @Param('id') id: string) {
    return this.rsvps.cancelMine(user, id);
  }

  @Post(':id/rsvp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'RSVP for a buffet' })
  rsvp(
    @CurrentUser() user: { id: string; tenantId?: string },
    @Param('id') id: string,
    @Body() dto: CreateBuffetRsvpDto,
  ) {
    return this.rsvps.create(user, id, dto);
  }

  // ── Admin ────────────────────────────────────────────────────────

  @Get('admin/rsvps')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN, UserRole.PLATFORM_STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buffet RSVPs for the admins' })
  adminRsvps(
    @Query('offerId') offerId?: string,
    @Query('status') status?: string,
    @Query('upcoming') upcoming?: string,
    @Query('page') page?: number,
  ) {
    return this.rsvps.adminList({ offerId, status, upcoming, page });
  }

  @Patch('admin/rsvps/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN, UserRole.PLATFORM_STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm or cancel a buffet RSVP, with a note' })
  reviewRsvp(
    @CurrentUser() user: { id: string; tenantId?: string },
    @Param('id') id: string,
    @Body() dto: ReviewBuffetRsvpDto,
  ) {
    return this.rsvps.review(user, id, dto);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN, UserRole.PLATFORM_STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all platform offers (Admin only)' })
  async listForAdmin(@Query('category') category?: string, @Query('status') status?: string) {
    return this.service.listForAdmin(category, status);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN, UserRole.PLATFORM_STAFF)
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
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN, UserRole.PLATFORM_STAFF)
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
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN, UserRole.PLATFORM_STAFF)
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
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN, UserRole.PLATFORM_STAFF)
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
