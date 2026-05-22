import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SegmentationService } from './segmentation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@saas/types';

@ApiTags('Audience Segmentation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
@Controller('segmentation')
export class SegmentationController {
  constructor(private readonly segmentationService: SegmentationService) {}

  @Get('users/active')
  @ApiOperation({ summary: 'Get active users segment (Admin only)' })
  async getActiveUsers(@CurrentUser('tenantId') tenantId: string, @Query('days') days?: number) {
    return this.segmentationService.getActiveUsers(tenantId, days ? Number(days) : undefined);
  }

  @Get('users/dormant')
  @ApiOperation({ summary: 'Get dormant users segment (Admin only)' })
  async getDormantUsers(@CurrentUser('tenantId') tenantId: string, @Query('days') days?: number) {
    return this.segmentationService.getDormantUsers(tenantId, days ? Number(days) : undefined);
  }

  @Get('users/high-value')
  @ApiOperation({ summary: 'Get high-value customers segment (Admin only)' })
  async getHighValueCustomers(
    @CurrentUser('tenantId') tenantId: string,
    @Query('minAmount') minAmount?: number,
  ) {
    return this.segmentationService.getHighValueCustomers(
      tenantId,
      minAmount ? Number(minAmount) : undefined,
    );
  }

  @Get('businesses/high-engagement')
  @ApiOperation({ summary: 'Get high-engagement businesses (Admin only)' })
  async getHighEngagementBusinesses(
    @CurrentUser('tenantId') tenantId: string,
    @Query('limit') limit?: number,
  ) {
    return this.segmentationService.getHighEngagementBusinesses(
      tenantId,
      limit ? Number(limit) : undefined,
    );
  }
}
