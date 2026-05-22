import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OnboardingAnalyticsService } from './onboarding-analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@saas/types';

@ApiTags('Admin Moderation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/onboarding/analytics')
export class OnboardingAnalyticsController {
  constructor(private readonly analyticsService: OnboardingAnalyticsService) {}

  @Get('funnel')
  @ApiOperation({
    summary: 'Get customer and business onboarding conversion funnel metrics (Admin only)',
  })
  async getFunnelStats(@CurrentUser('tenantId') tenantId: string) {
    return this.analyticsService.getFunnelStats(tenantId);
  }
}
