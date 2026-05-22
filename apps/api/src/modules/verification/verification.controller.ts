import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@saas/types';

@ApiTags('Verification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post(':businessId/submit')
  @ApiOperation({ summary: 'Submit a business for verification' })
  async submitRequest(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('businessId') businessId: string,
  ) {
    return this.verificationService.submitRequest(tenantId, businessId, userId);
  }

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Get('pending')
  @ApiOperation({ summary: 'Get all pending verification requests (Admin only)' })
  async getPendingRequests(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
  ) {
    return this.verificationService.getPendingRequests(tenantId, page);
  }

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a verification request (Admin only)' })
  async approveRequest(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
  ) {
    return this.verificationService.approveRequest(tenantId, id, adminId);
  }

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a verification request (Admin only)' })
  async rejectRequest(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.verificationService.rejectRequest(tenantId, id, adminId, reason);
  }
}
