import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsSummaryService } from './analytics-summary.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@saas/types';
import { TrackEventDto } from './dto/track-event.dto';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly summaryService: AnalyticsSummaryService,
  ) {}

  @Public()
  @Post('track')
  @ApiOperation({ summary: 'Ingest analytics event' })
  async track(@Body() data: TrackEventDto): Promise<any> {
    return this.analyticsService.trackEvent(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Get('overview')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get overview dashboard metrics (Admin only)' })
  async getOverview(@CurrentUser('tenantId') tenantId: string) {
    return this.analyticsService.getOverview(tenantId);
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
    @Query('days') days?: number,
  ) {
    return this.analyticsService.getBusinessAnalytics(
      tenantId,
      businessId,
      days ? Number(days) : undefined,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('business/:businessId/summary')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rich business analytics summary — offers, redemptions, reviews, team, impressions' })
  async getBusinessSummary(
    @CurrentUser('tenantId') tenantId: string,
    @Param('businessId') businessId: string,
    @Query('days') days?: number,
  ) {
    return this.analyticsService.getBusinessSummary(
      tenantId,
      businessId,
      days ? Number(days) : undefined,
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
