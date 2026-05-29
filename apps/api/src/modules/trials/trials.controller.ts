import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TrialsService } from './trials.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Trials')
@Controller('trials')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TrialsController {
  constructor(private readonly trialsService: TrialsService) {}

  /**
   * Business owner: get trial status for their business
   */
  @Get('status/:businessId')
  @ApiOperation({ summary: 'Get trial status for a business' })
  async getTrialStatus(
    @CurrentUser('tenantId') tenantId: string,
    @Param('businessId') businessId: string,
  ) {
    return this.trialsService.getMyTrial(tenantId, businessId);
  }

  /**
   * Business owner: claim 20% introductory offer (once per business)
   */
  @Post('claim-intro-offer/:businessId')
  @ApiOperation({ summary: 'Claim the 20% introductory offer for first subscription' })
  async claimIntroOffer(
    @CurrentUser('tenantId') tenantId: string,
    @Param('businessId') businessId: string,
  ) {
    return this.trialsService.claimIntroOffer(tenantId, businessId);
  }

  /**
   * Admin / Super-admin: platform-wide trial stats
   */
  @Get('admin/stats')
  @ApiOperation({ summary: 'Platform trial statistics (admin only)' })
  async getTrialStats(@CurrentUser('tenantId') tenantId: string) {
    return this.trialsService.getTrialStats(tenantId);
  }
}
