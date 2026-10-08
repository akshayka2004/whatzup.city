import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DatabaseService } from '../../common/database/database.service';
import { assertBusinessAccess } from '../../common/utils/business-access';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly db: DatabaseService,
  ) {}

  @Get(':businessId/metrics')
  @ApiOperation({ summary: 'Get key dashboard metrics for a business' })
  async getMetrics(
    @CurrentUser('tenantId') tenantId: string,
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string; role?: string },
  ) {
    await assertBusinessAccess(this.db, businessId, user);
    return this.dashboardService.getMetrics(tenantId, businessId);
  }

  @Get(':businessId/completeness')
  @ApiOperation({ summary: 'Get business profile completeness score' })
  async getCompleteness(
    @CurrentUser('tenantId') tenantId: string,
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string; role?: string },
  ) {
    await assertBusinessAccess(this.db, businessId, user);
    return this.dashboardService.getProfileCompleteness(tenantId, businessId);
  }
}
