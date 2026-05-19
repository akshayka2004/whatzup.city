import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@saas/types';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Public()
  @Post('track')
  async track(@Body() data: any): Promise<any> {
    return this.analyticsService.trackEvent(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('overview')
  @ApiBearerAuth()
  async getOverview(@CurrentUser('tenantId') tenantId: string) {
    return this.analyticsService.getOverview(tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('business/:businessId')
  @ApiBearerAuth()
  async getBusinessAnalytics(
    @Param('businessId') businessId: string,
    @Query('days') days?: number,
  ) {
    return this.analyticsService.getBusinessAnalytics(businessId, days);
  }
}
