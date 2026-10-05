import {
  Controller,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BillVerificationsService } from './bill-verifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@saas/types';
import { ReassignBillDto } from '../brands/dto/brand.dto';

// ============================================================
// Bill Verification Controller — Role Hierarchy
//
// BUSINESS_OWNER   → Full access: approve, reject, flag, override
// BUSINESS_MODERATOR → Approve, reject, request re-upload (no override)
// MASTER_ADMIN     → Read-only fraud escalation monitoring
// SUPER_ADMIN      → Full global override access
// ============================================================

@ApiTags('Bill Verifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class BillVerificationsController {
  constructor(private readonly verificationsService: BillVerificationsService) {}

  // ── BUSINESS-SCOPED ENDPOINTS ─────────────────────────────────────

  /**
   * GET /api/businesses/:businessId/bill-verifications/pending
   * Business moderation queue — for BUSINESS_OWNER and BUSINESS_MODERATOR
   */
  @Roles(UserRole.BUSINESS_OWNER, UserRole.BUSINESS_MODERATOR, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  @Get('businesses/:businessId/bill-verifications')
  @ApiOperation({ summary: 'Get business bill verification queue' })
  async getBusinessQueue(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @CurrentUser('role') actorRole: string,
    @Param('businessId') businessId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
  ) {
    await this.verificationsService.assertCanModerate(actorId, actorRole, businessId);
    return this.verificationsService.getBusinessQueue(tenantId, businessId, status, page, undefined, actorRole);
  }

  /**
   * POST /api/businesses/:businessId/bill-verifications/:id/approve
   * Approve a bill — BUSINESS_OWNER, BUSINESS_MODERATOR, SUPER_ADMIN
   */
  @Roles(UserRole.BUSINESS_OWNER, UserRole.BUSINESS_MODERATOR, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  @Post('businesses/:businessId/bill-verifications/:id/approve')
  @ApiOperation({ summary: 'Approve a customer bill (business moderator action)' })
  async approve(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @CurrentUser('role') actorRole: string,
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    await this.verificationsService.assertCanModerate(actorId, actorRole, businessId);
    return this.verificationsService.approve(tenantId, id, actorId, actorRole, businessId);
  }

  /**
   * POST /api/businesses/:businessId/bill-verifications/:id/reject
   * Reject a bill — BUSINESS_OWNER, BUSINESS_MODERATOR, SUPER_ADMIN
   */
  @Roles(UserRole.BUSINESS_OWNER, UserRole.BUSINESS_MODERATOR, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  @Post('businesses/:businessId/bill-verifications/:id/reject')
  @ApiOperation({ summary: 'Reject a customer bill (business moderator action)' })
  async reject(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @CurrentUser('role') actorRole: string,
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    await this.verificationsService.assertCanModerate(actorId, actorRole, businessId);
    return this.verificationsService.reject(tenantId, id, actorId, actorRole, businessId, reason);
  }

  /**
   * POST /api/businesses/:businessId/bill-verifications/:id/flag
   * Flag for internal escalation — BUSINESS_OWNER, BUSINESS_MODERATOR
   */
  @Roles(UserRole.BUSINESS_OWNER, UserRole.BUSINESS_MODERATOR, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  @Post('businesses/:businessId/bill-verifications/:id/flag')
  @ApiOperation({ summary: 'Flag a bill for escalation or fraud review' })
  async flag(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @CurrentUser('role') actorRole: string,
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    await this.verificationsService.assertCanModerate(actorId, actorRole, businessId);
    return this.verificationsService.flag(tenantId, id, actorId, actorRole, businessId, reason);
  }

  /**
   * POST /api/businesses/:businessId/bill-verifications/:id/request-reupload
   * Ask customer to re-upload — BUSINESS_OWNER, BUSINESS_MODERATOR
   */
  @Roles(UserRole.BUSINESS_OWNER, UserRole.BUSINESS_MODERATOR, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  @Post('businesses/:businessId/bill-verifications/:id/request-reupload')
  @ApiOperation({ summary: 'Request customer to re-upload bill' })
  async requestReUpload(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @CurrentUser('role') actorRole: string,
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    await this.verificationsService.assertCanModerate(actorId, actorRole, businessId);
    return this.verificationsService.requestReUpload(tenantId, id, actorId, businessId, reason);
  }

  /**
   * POST /api/businesses/:businessId/bill-verifications/:id/owner-override
   * BUSINESS_OWNER can override a BUSINESS_MODERATOR decision
   */
  @Roles(UserRole.BUSINESS_OWNER, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  @Post('businesses/:businessId/bill-verifications/:id/owner-override')
  @ApiOperation({ summary: 'Business owner overrides moderator decision' })
  async ownerOverride(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') ownerId: string,
    @CurrentUser('role') actorRole: string,
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Body('decision') decision: 'APPROVED' | 'REJECTED',
    @Body('reason') reason?: string,
  ) {
    await this.verificationsService.assertCanModerate(ownerId, actorRole, businessId);
    return this.verificationsService.ownerOverride(tenantId, id, ownerId, businessId, decision, reason);
  }

  // ── BRAND-WIDE ENDPOINTS ──────────────────────────────────────────

  /**
   * GET /api/brands/:brandId/bill-verifications?outletId=&status=&page=
   * All outlets of a brand in one queue — brand owner (or platform admin)
   */
  @Roles(UserRole.BUSINESS_OWNER, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)
  @Get('brands/:brandId/bill-verifications')
  @ApiOperation({ summary: "Brand-wide bill queue across all of the brand's outlets" })
  async getBrandQueue(
    @CurrentUser('id') actorId: string,
    @CurrentUser('role') actorRole: string,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Query('outletId') outletId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
  ) {
    return this.verificationsService.getBrandQueue(actorId, actorRole, brandId, { outletId, status, page });
  }

  /**
   * POST /api/bill-verifications/:id/reassign-outlet
   * Move an undecided bill to the right outlet of the same brand (shared bill series)
   */
  @Roles(UserRole.BUSINESS_OWNER, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  @Post('bill-verifications/:id/reassign-outlet')
  @ApiOperation({ summary: 'Move a bill to another outlet of the same brand' })
  async reassignOutlet(
    @CurrentUser('id') actorId: string,
    @CurrentUser('role') actorRole: string,
    @Param('id') id: string,
    @Body() dto: ReassignBillDto,
  ) {
    return this.verificationsService.reassignOutlet(actorId, actorRole, id, dto.outletId);
  }

  // ── FRAUD ANALYSIS (Business level) ──────────────────────────────

  /**
   * POST /api/businesses/:businessId/bill-verifications/:id/calculate-fraud
   */
  @Roles(UserRole.BUSINESS_OWNER, UserRole.BUSINESS_MODERATOR, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  @Post('businesses/:businessId/bill-verifications/:id/calculate-fraud')
  @ApiOperation({ summary: 'Run fraud analysis on a verification' })
  async calculateFraud(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @CurrentUser('role') actorRole: string,
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    await this.verificationsService.assertCanModerate(actorId, actorRole, businessId);
    return this.verificationsService.calculateFraud(tenantId, id);
  }

  // ── ADMIN / PLATFORM ESCALATION ENDPOINTS ────────────────────────

  /**
   * GET /api/admin/bill-verifications/escalated
   * Fraud escalation queue — MASTER_ADMIN and SUPER_ADMIN only
   * MASTER_ADMIN has READ-ONLY visibility here; cannot directly approve
   */
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/bill-verifications/escalated')
  @ApiOperation({ summary: 'Platform fraud escalation queue (MASTER_ADMIN monitor)' })
  async getEscalatedQueue(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('role') actorRole: string,
    @Query('page') page?: number,
  ) {
    return this.verificationsService.getEscalatedQueue(tenantId, page, 20, actorRole);
  }

  /**
   * POST /api/admin/bill-verifications/:id/platform-intervene
   * SUPER_ADMIN platform-level intervention only
   */
  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/bill-verifications/:id/platform-intervene')
  @ApiOperation({ summary: 'Super Admin platform-level intervention on escalated bill' })
  async platformIntervene(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body('decision') decision: 'APPROVED' | 'REJECTED',
    @Body('reason') reason: string,
  ) {
    if (decision === 'REJECTED') {
      return this.verificationsService.reject(tenantId, id, adminId, UserRole.SUPER_ADMIN, undefined, reason);
    }
    return this.verificationsService.approve(tenantId, id, adminId, UserRole.SUPER_ADMIN, undefined, reason);
  }

  // ── LEGACY ENDPOINT (kept for backward compat, will be removed) ──

  /**
   * @deprecated Use GET /businesses/:businessId/bill-verifications instead
   */
  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/bill-verifications/pending')
  @ApiOperation({ summary: '[Deprecated] Legacy pending queue — use /escalated instead' })
  async getPending(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('role') actorRole: string,
    @Query('page') page?: number,
  ) {
    return this.verificationsService.getEscalatedQueue(tenantId, page, 20, actorRole);
  }
}
