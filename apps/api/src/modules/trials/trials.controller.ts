import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PaymentsEnabledGuard } from '../../common/guards/payments-enabled.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TrialsService } from './trials.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@saas/types';
import { DatabaseService } from '../../common/database/database.service';
import { assertBusinessAccess, type AccessUser } from '../../common/utils/business-access';

@ApiTags('Trials')
@Controller('trials')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TrialsController {
  constructor(
    private readonly trialsService: TrialsService,
    private readonly db: DatabaseService,
  ) {}

  /**
   * Business owner: get trial status for their business
   */
  @Get('status/:businessId')
  @ApiOperation({ summary: 'Get trial status for a business' })
  async getTrialStatus(
    @CurrentUser('tenantId') tenantId: string,
    @Param('businessId') businessId: string,
    @CurrentUser() user: AccessUser,
  ) {
    await assertBusinessAccess(this.db, businessId, user);
    return this.trialsService.getMyTrial(tenantId, businessId);
  }

  /**
   * Business owner: claim 20% introductory offer (once per business)
   */
  @UseGuards(PaymentsEnabledGuard)
  @Post('claim-intro-offer/:businessId')
  @ApiOperation({ summary: 'Claim the 20% introductory offer for first subscription' })
  async claimIntroOffer(
    @CurrentUser('tenantId') tenantId: string,
    @Param('businessId') businessId: string,
    @CurrentUser() user: AccessUser,
  ) {
    await assertBusinessAccess(this.db, businessId, user);
    return this.trialsService.claimIntroOffer(tenantId, businessId);
  }

  /**
   * Admin / Super-admin: platform-wide trial stats
   */
  @UseGuards(RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/stats')
  @ApiOperation({ summary: 'Platform trial statistics (admin only)' })
  async getTrialStats(@CurrentUser('tenantId') tenantId: string) {
    return this.trialsService.getTrialStats(tenantId);
  }
}
