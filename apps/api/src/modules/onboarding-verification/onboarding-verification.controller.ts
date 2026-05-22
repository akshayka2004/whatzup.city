import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OnboardingVerificationService } from './onboarding-verification.service';
import { ApproveOnboardingDto, RejectOnboardingDto } from './dto/verification-action.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, EntityType } from '@saas/types';

@ApiTags('Admin Moderation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/businesses')
export class OnboardingVerificationController {
  constructor(private readonly verificationService: OnboardingVerificationService) {}

  @Get('pending')
  @ApiOperation({ summary: 'List all pending business onboarding submissions (Admin only)' })
  async getPending(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('type') type?: EntityType,
    @Query('categoryId') categoryId?: string,
    @Query('city') city?: string,
  ) {
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 20;
    return this.verificationService.getPending(tenantId, pageNum, limitNum, {
      status,
      search,
      type,
    });
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve business onboarding request (Admin only)' })
  async approve(
    @CurrentUser('id') adminId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') businessId: string,
    @Body() dto: ApproveOnboardingDto,
  ) {
    return this.verificationService.approve(adminId, tenantId, businessId, dto);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject business onboarding request (Admin only)' })
  async reject(
    @CurrentUser('id') adminId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') businessId: string,
    @Body() dto: RejectOnboardingDto,
  ) {
    return this.verificationService.reject(adminId, tenantId, businessId, dto);
  }
}
