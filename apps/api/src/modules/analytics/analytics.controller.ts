import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsSummaryService } from './analytics-summary.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@saas/types';
import { TrackBatchDto, TrackEventDto } from './dto/track-event.dto';
import type { Request } from 'express';

function requestContext(req: Request) {
  const fwd = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim() || req.ip || undefined;
  const user = (req as any).user as { id?: string; userId?: string; sub?: string } | undefined;
  return {
    ip,
    userAgent: (req.headers['user-agent'] as string | undefined) ?? undefined,
    userId: user?.id || user?.userId || user?.sub,
  };
}

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly summaryService: AnalyticsSummaryService,
  ) {}

  // Unauthenticated ingest — capped per IP so it can't be used to flood the
  // analytics table.
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Public()
  @Post('track')
  @ApiOperation({ summary: 'Ingest analytics event' })
  async track(@Body() data: TrackEventDto, @Req() req: Request): Promise<any> {
    return this.analyticsService.trackEvent(data, requestContext(req));
  }

  // Batched ingest (sendBeacon on page hide). Each event still counts against nothing
  // extra server-side, so the batch is capped at 25 and throttled like single events.
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Public()
  @Post('track/batch')
  @ApiOperation({ summary: 'Ingest up to 25 analytics events' })
  async trackBatch(@Body() body: TrackBatchDto, @Req() req: Request) {
    const ctx = requestContext(req);
    let accepted = 0;
    for (const e of body.events) {
      if ((await this.analyticsService.trackEvent(e, ctx)).accepted) accepted++;
    }
    return { accepted };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Get('overview')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get overview dashboard metrics (Admin only)' })
  async getOverview(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.analyticsService.getOverview(tenantId, role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Get('detailed')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get detailed analytics audit trends (Admin only)' })
  async getDetailedAnalytics(@CurrentUser('tenantId') tenantId: string) {
    return this.analyticsService.getDetailedAnalytics(tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('business/:businessId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get business-specific metrics safely isolated by tenant' })
  async getBusinessAnalytics(
    @CurrentUser('tenantId') tenantId: string,
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string; role?: string },
    @Query('days') days?: number,
  ) {
    return this.analyticsService.getBusinessAnalytics(
      tenantId,
      businessId,
      days ? Number(days) : undefined,
      user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('business/:businessId/summary')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rich business analytics summary — offers, redemptions, reviews, team, impressions' })
  async getBusinessSummary(
    @CurrentUser('tenantId') tenantId: string,
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string; role?: string },
    @Query('days') days?: number,
  ) {
    return this.analyticsService.getBusinessSummary(
      tenantId,
      businessId,
      days ? Number(days) : undefined,
      user,
    );
  }

  // ── Summary table endpoints ───────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Get('top-spenders')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Top spenders leaderboard from pre-aggregated summary (Admin only)' })
  async getTopSpenders(
    @CurrentUser('tenantId') tenantId: string,
    @Query('limit') limit?: number,
  ) {
    return this.summaryService.getTopSpenders(tenantId, limit ? Number(limit) : 10);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Get('top-referrers')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Top referrers leaderboard from pre-aggregated summary (Admin only)' })
  async getTopReferrers(
    @Query('entityType') entityType?: string,
    @Query('limit') limit?: number,
  ) {
    return this.summaryService.getTopReferrers(entityType, limit ? Number(limit) : 10);
  }
}
