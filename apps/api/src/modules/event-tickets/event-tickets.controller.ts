import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRole } from '@saas/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  BookingSettingsDto,
  CancelTicketsDto,
  CreateCrewPassesDto,
  DecisionDto,
  MessageAttendeesDto,
  RsvpDto,
  WaitlistDto,
} from './dto/event-tickets.dto';
import { EventActor } from './event-access';
import { EventAnalyticsService } from './event-analytics.service';
import { EventCrewService } from './event-crew.service';
import { EventTicketsService } from './event-tickets.service';

// RSVP, ticket and host routes are limited per account inside the service, not per IP: a whole
// venue (or a notification that sends thousands of people to the same page) shares IPs.

@ApiTags('Event tickets')
@SkipThrottle()
@Controller('events')
export class EventTicketsController {
  constructor(
    private readonly tickets: EventTicketsService,
    private readonly crew: EventCrewService,
    private readonly analytics: EventAnalyticsService,
  ) {}

  // ── moderation (literal routes first) ───────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN, UserRole.PLATFORM_STAFF)
  @Get('admin/booking/pending')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Events waiting for RSVP approval' })
  pending(@Query('page') page?: number) {
    return this.tickets.pendingApprovals(page);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN, UserRole.PLATFORM_STAFF)
  @Post('admin/booking/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  approve(@CurrentUser('id') adminId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.tickets.decide(adminId, id, true);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN, UserRole.PLATFORM_STAFF)
  @Post('admin/booking/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  reject(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecisionDto,
  ) {
    return this.tickets.decide(adminId, id, false, dto.reason);
  }

  // ── attendee ────────────────────────────────────────────────────────────

  @Public()
  @Header('Cache-Control', 'public, max-age=5, s-maxage=5')
  @Get(':id/booking')
  @ApiOperation({ summary: 'RSVP state and seats left (public, cached for 5 seconds)' })
  booking(@Param('id', ParseUUIDPipe) id: string) {
    return this.tickets.getBooking(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/booking/me')
  @ApiBearerAuth()
  myBooking(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.tickets.myBooking(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/rsvp')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'RSVP and receive tickets. Signed-in platform users only.' })
  rsvp(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RsvpDto,
  ) {
    return this.tickets.rsvp(userId, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/rsvp/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  cancel(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelTicketsDto,
  ) {
    return this.tickets.cancel(userId, id, dto.ticketIds);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/waitlist')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  join(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WaitlistDto,
  ) {
    return this.tickets.joinWaitlist(userId, id, dto.seats);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/waitlist')
  @ApiBearerAuth()
  leave(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.tickets.leaveWaitlist(userId, id);
  }

  // ── host ────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get(':id/host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Booking settings and counts for the host' })
  hostSummary(@CurrentUser() user: EventActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.tickets.hostSummary(user, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/booking')
  @ApiBearerAuth()
  updateBooking(
    @CurrentUser() user: EventActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BookingSettingsDto,
  ) {
    return this.tickets.updateBooking(user, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/host/attendees')
  @ApiBearerAuth()
  attendees(
    @CurrentUser() user: EventActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.tickets.attendees(user, id, { status, search, page, limit });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/host/attendees.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="attendees.csv"')
  @Header('Cache-Control', 'no-store')
  @ApiBearerAuth()
  async attendeesCsv(@CurrentUser() user: EventActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.tickets.attendeesCsv(user, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/host/analytics')
  @ApiBearerAuth()
  hostAnalytics(@CurrentUser() user: EventActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.analytics.forEvent(user, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/host/message')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  message(
    @CurrentUser() user: EventActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MessageAttendeesDto,
  ) {
    return this.tickets.message(user, id, dto.title, dto.body);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/host/crew')
  @ApiBearerAuth()
  crewList(@CurrentUser() user: EventActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.crew.list(user, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/host/crew')
  @ApiBearerAuth()
  crewCreate(
    @CurrentUser() user: EventActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCrewPassesDto,
  ) {
    return this.crew.create(user, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/host/crew/:passId/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  crewRevoke(
    @CurrentUser() user: EventActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('passId', ParseUUIDPipe) passId: string,
  ) {
    return this.crew.revoke(user, id, passId);
  }
}
