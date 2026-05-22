import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SearchAnalyticsService } from './search-analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@saas/types';

@ApiTags('Search Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search-analytics')
export class SearchAnalyticsController {
  constructor(private readonly analyticsService: SearchAnalyticsService) {}

  @Post('track-click')
  @ApiOperation({ summary: 'Track a click-through from search results' })
  async trackClick(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { businessId: string; query?: string; position?: number },
  ) {
    await this.analyticsService.trackClickThrough({
      tenantId,
      userId,
      ...body,
    });
    return { tracked: true };
  }

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @Get('metrics')
  @ApiOperation({ summary: 'Get search metrics summary (Admin only)' })
  async metrics(@CurrentUser('tenantId') tenantId: string, @Query('days') days?: number) {
    return this.analyticsService.getSearchMetrics(tenantId, days || 30);
  }

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @Get('popular-terms')
  @ApiOperation({ summary: 'Get popular search terms (Admin only)' })
  async popularTerms(@CurrentUser('tenantId') tenantId: string, @Query('days') days?: number) {
    return this.analyticsService.getPopularSearchTerms(tenantId, days || 7);
  }
}
