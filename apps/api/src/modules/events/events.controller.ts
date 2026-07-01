import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@saas/types';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active public events (optionally by city)' })
  async findPublic(@Query('city') city?: string, @Query('page') page?: number) {
    return this.eventsService.findPublicActive(city, page);
  }

  // ── Super-admin analytics (declared before :id to avoid capture) ──
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/all')
  @ApiBearerAuth()
  async adminAll(@Query('page') page?: number) {
    return this.eventsService.adminFindAll(page);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/registrations')
  @ApiBearerAuth()
  async adminRegistrations(@Query('eventId') eventId?: string, @Query('page') page?: number) {
    return this.eventsService.adminRegistrations(eventId, page);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine/:businessId')
  @ApiBearerAuth()
  async findMine(@CurrentUser('tenantId') tenantId: string, @Param('businessId') businessId: string) {
    return this.eventsService.findMine(tenantId, businessId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get one event' })
  async findOne(@Param('id') id: string) {
    return this.eventsService.findById(id);
  }

  @Public()
  @Post(':id/click')
  @ApiOperation({ summary: 'Record an outbound register/ticket click; returns the URL' })
  async trackClick(
    @Param('id') id: string,
    @Body() body: { type?: string },
    @CurrentUser('id') userId?: string,
  ) {
    return this.eventsService.trackClick(id, body?.type || 'REGISTER', userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.eventsService.create(tenantId, userId, dto.businessId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth()
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.eventsService.update(tenantId, dto.businessId, id, userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  async remove(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('businessId') businessId: string,
  ) {
    return this.eventsService.remove(tenantId, businessId, id, userId);
  }
}
