import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BusinessIntelligenceService } from './bi.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@saas/types';

@ApiTags('Business Intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
@Controller('business-intelligence')
export class BusinessIntelligenceController {
  constructor(private readonly biService: BusinessIntelligenceService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Get high-level platform-wide KPIs (Admin only)' })
  async getKPIs(@CurrentUser('tenantId') tenantId: string, @Query('days') days?: number) {
    return this.biService.getPlatformKPIs(tenantId, days ? Number(days) : undefined);
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Get recommendation engine performance and conversions' })
  async getRecommendationAnalytics(
    @CurrentUser('tenantId') tenantId: string,
    @Query('days') days?: number,
  ) {
    return this.biService.getRecommendationAnalytics(tenantId, days ? Number(days) : undefined);
  }
}
