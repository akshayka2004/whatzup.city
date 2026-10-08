import { Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@saas/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AnalyticsV2Service, type Granularity } from './analytics-v2.service';
import { AnalyticsRollupService } from './analytics-rollup.service';

type RangeParams = { from?: string; to?: string; days?: string; granularity?: Granularity };

const toQuery = (q: RangeParams) => ({
  from: q.from,
  to: q.to,
  days: q.days ? Number(q.days) : undefined,
  granularity: q.granularity,
});

@ApiTags('Analytics v2')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics/v2')
export class AnalyticsV2Controller {
  constructor(
    private readonly v2: AnalyticsV2Service,
    private readonly rollups: AnalyticsRollupService,
  ) {}

  @Get('business/:businessId/report')
  @ApiOperation({ summary: 'Business report: KPIs vs previous period, IST series, funnel, sources, heatmap, offers' })
  businessReport(
    @Param('businessId', new ParseUUIDPipe()) businessId: string,
    @CurrentUser() user: { id: string; role?: string },
    @Query() q: RangeParams,
  ) {
    return this.v2.businessReport(businessId, user, toQuery(q));
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Get('platform/report')
  @ApiOperation({ summary: 'Platform report across all tenants (admins only)' })
  platformReport(@Query() q: RangeParams) {
    return this.v2.platformReport(toQuery(q));
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post('rollups/backfill')
  @ApiOperation({ summary: 'Recompute daily business rollups for the last N IST days (super admin)' })
  backfill(@Query('days') days?: string) {
    return this.rollups.backfill(days ? Number(days) : 90);
  }
}
