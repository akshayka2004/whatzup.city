import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { BillVerificationRepository } from '../../common/database/repositories/bill-verification.repository';
import { BillRepository } from '../../common/database/repositories/bill.repository';
import { FraudService } from '../fraud/fraud.service';
import { AuditService } from '../audit/audit.service';
import { VerifiedPurchasesService } from '../verified-purchases/verified-purchases.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaginationParamsDto, SortOrder } from '../../common/database/pagination/pagination.dto';
import { AnalyticsSummaryService } from '../analytics/analytics-summary.service';
import { DatabaseService } from '../../common/database/database.service';
import { BrandScopeService } from '../brands/brand-scope.service';
import { BrandsService } from '../brands/brands.service';
import { billNumberMatchesSeries } from '../../common/utils/bill-number';

// Business-level owner roles (string-literal comparison for forward compat)
const OWNER_ROLES = ['BUSINESS_OWNER', 'BUSINESS_ADMIN', 'SUPER_ADMIN'] as const;


// Fraud thresholds
const FRAUD_ESCALATE_TO_OWNER_THRESHOLD = 0.6;
const FRAUD_ESCALATE_TO_PLATFORM_THRESHOLD = 0.8;


@Injectable()
export class BillVerificationsService {
  private readonly logger = new Logger(BillVerificationsService.name);

  constructor(
    private readonly verificationRepo: BillVerificationRepository,
    private readonly billRepo: BillRepository,
    private readonly fraudService: FraudService,
    private readonly auditService: AuditService,
    private readonly verifiedPurchasesService: VerifiedPurchasesService,
    private readonly notificationsService: NotificationsService,
    private readonly analyticsSummary: AnalyticsSummaryService,
    private readonly db: DatabaseService,
    private readonly brandScope: BrandScopeService,
    private readonly brands: BrandsService,
  ) {}

  /**
   * Global loyalty points — 1 point per ₹1 of verified spend, platform-wide.
   * Idempotent on billId (unique constraint), so a bill can never award twice
   * even if approval logic is ever re-run.
   */
  private async awardPoints(tenantId: string, userId: string, billId: string, amount: number) {
    try {
      await this.db.pointsEntry.create({
        data: { tenantId, userId, billId, points: amount },
      });
    } catch (err: any) {
      if (err?.code !== 'P2002') throw err;
    }
  }

  /**
   * True if the bill's invoice number starts with the applicable bill series prefix (the brand's
   * when the brand shares one series, otherwise the business's own). Checks the number the customer
   * typed first, then the OCR guess. Informational only — never auto-approves; moderators still
   * review every bill, this just shows which ones already line up with the series.
   */
  private seriesMatched(prefix: string | null | undefined, verification: any): boolean {
    if (!prefix) return false;
    return (
      billNumberMatchesSeries(prefix, verification?.bill?.billNumber) ||
      billNumberMatchesSeries(prefix, verification?.ocrMetadata?.parsed?.invoiceNumber)
    );
  }

  /**
   * The role guard only checks the actor's ROLE, not that they belong to the business in the URL —
   * without this any owner/moderator could act on another business's bills by editing the path.
   * Platform admins pass; everyone else must own the business or be on its active staff.
   */
  async assertCanModerate(actorId: string, actorRole: string, businessId: string): Promise<void> {
    if (['SUPER_ADMIN', 'MASTER_ADMIN'].includes(actorRole)) return;
    const business = await this.db.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId === actorId) return;
    if (await this.brandScope.isBrandOwnerOf(actorId, businessId)) return;
    const staff = await this.db.businessStaff.findFirst({
      where: { businessId, userId: actorId, deletedAt: null, isActive: true },
      select: { id: true },
    });
    if (!staff) throw new ForbiddenException('You are not part of this business.');
  }

  // ── BUSINESS-SCOPED QUEUE ─────────────────────────────────────────

  /**
   * Returns the bill verification queue for a specific business.
   * Used by BUSINESS_OWNER and BUSINESS_MODERATOR dashboard.
   */
  async getBusinessQueue(
    tenantId: string,
    businessId: string,
    status?: string,
    page = 1,
    limit = 20,
    actorRole?: string,
  ) {
    const pagination = new PaginationParamsDto();
    pagination.page = page;
    pagination.limit = limit;
    pagination.sortBy = 'createdAt';
    pagination.sortOrder = SortOrder.ASC;

    const statusFilter: Record<string, any> = {};
    if (status && status !== 'ALL') {
      statusFilter.status = status;
    } else if (!status) {
      // Default to PENDING for the moderation queue (no explicit status means "show pending work")
      statusFilter.status = 'PENDING';
    }
    // status === 'ALL' → no status filter → return all bills for the business

    // Business-scoped (NOT tenant-scoped): bills are uploaded under the
    // customer's tenant, so filtering by the owner's tenant would hide them.
    const result = await this.verificationRepo.findManyByBusiness(
      businessId,
      statusFilter,
      { page: pagination.page, limit: pagination.limit, sortBy: 'createdAt', sortOrder: 'asc' },
      {
        bill: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            business: { select: { id: true, name: true } },
            items: true,
          },
        },
      },
    );

    if (actorRole !== 'SUPER_ADMIN' && result?.data) {
      result.data = result.data.map((v: any) => {
        if (v.bill?.user) {
          const userCopy = { ...v.bill.user };
          delete userCopy.email;
          delete userCopy.phone;
          return {
            ...v,
            bill: {
              ...v.bill,
              user: userCopy,
            },
          };
        }
        return v;
      });
    }

    if (result?.data?.length) {
      const series = await this.brandScope.resolveBillSeries(businessId);
      result.data = result.data.map((v: any) => ({
        ...v,
        seriesMatched: this.seriesMatched(series.prefix, v),
        // 'SHARED' means the match only proves the bill is from the brand, not which outlet.
        seriesScope: series.mode,
        seriesPrefix: series.prefix,
      }));
    }

    return result;
  }

  // ── BRAND-WIDE QUEUE ──────────────────────────────────────────────

  /**
   * Every outlet's bills in one list, for the brand owner. Staff of a single outlet keep using the
   * per-business queue; this is only for the account that owns the brand (or platform admins).
   */
  async getBrandQueue(
    actorId: string,
    actorRole: string,
    brandId: string,
    opts: { outletId?: string; status?: string; page?: number; limit?: number } = {},
  ) {
    const isPlatform = ['SUPER_ADMIN', 'MASTER_ADMIN'].includes(actorRole);
    // tenant-scope-ok: ownership (ownerId) / platform role is the scope
    const brand = await this.db.brand.findFirst({
      where: { id: brandId, deletedAt: null, ...(isPlatform ? {} : { ownerId: actorId }) },
      select: { id: true, billSeriesMode: true, billSeriesPrefix: true },
    });
    if (!brand) throw new NotFoundException('Brand not found');

    const outletIds = await this.brandScope.outletIds(brandId);
    if (opts.outletId && !outletIds.includes(opts.outletId)) {
      throw new NotFoundException('Outlet not found in this brand');
    }
    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.min(Math.max(Number(opts.limit) || 20, 1), 100);
    const where: Record<string, any> = {
      deletedAt: null,
      businessId: opts.outletId ? opts.outletId : { in: outletIds },
    };
    if (opts.status && opts.status !== 'ALL') where.status = opts.status;
    else if (!opts.status) where.status = 'PENDING';

    const [rows, total] = await Promise.all([
      // tenant-scope-ok: bills live in the customer's tenant; the brand's outlets are the scope
      this.db.billVerification.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          bill: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              business: { select: { id: true, name: true } },
              items: true,
            },
          },
        },
      }),
      // tenant-scope-ok: bills live in the customer's tenant; the brand's outlets are the scope
      this.db.billVerification.count({ where }),
    ]);

    const shared = brand.billSeriesMode === 'SHARED';
    const data = rows.map((v: any) => {
      const user = v.bill?.user && !isPlatform ? { id: v.bill.user.id, name: v.bill.user.name } : v.bill?.user;
      return {
        ...v,
        bill: v.bill ? { ...v.bill, user } : v.bill,
        seriesMatched: this.seriesMatched(shared ? brand.billSeriesPrefix : null, v),
        seriesScope: shared ? 'SHARED' : 'PER_OUTLET',
      };
    });
    return { data, total, page, limit };
  }

  /**
   * Under a shared series the customer picks the outlet, so they can pick the wrong one. The brand
   * owner moves a bill that has not been decided yet to the right outlet before it is approved, so
   * the verified purchase, review eligibility and the moderator's queue all land on the right place.
   */
  async reassignOutlet(actorId: string, actorRole: string, verificationId: string, outletId: string) {
    const verification = await this.verificationRepo.findByIdUnsafe(verificationId, { bill: true });
    if (!verification || !verification.bill) throw new NotFoundException('Verification not found');
    const fromId = verification.businessId ?? verification.bill.businessId;

    // MASTER_ADMIN is read-only on bill verifications, so only SUPER_ADMIN may act for the platform.
    const isPlatform = actorRole === 'SUPER_ADMIN';
    // tenant-scope-ok: both outlets are looked up by id; brand match is checked below
    const [from, to] = await Promise.all([
      this.db.business.findUnique({ where: { id: fromId }, select: { id: true, name: true, brandId: true, tenantId: true, brand: { select: { ownerId: true, name: true } } } }),
      this.db.business.findUnique({ where: { id: outletId }, select: { id: true, name: true, brandId: true, status: true, deletedAt: true } }),
    ]);
    if (!from || !to || to.deletedAt) throw new NotFoundException('Outlet not found');
    if (!from.brandId || from.brandId !== to.brandId) {
      throw new BadRequestException('A bill can only be moved between outlets of the same brand.');
    }
    if (!isPlatform && from.brand?.ownerId !== actorId) {
      throw new ForbiddenException('Only the brand owner can move a bill to another outlet.');
    }
    if (from.id === to.id) return verification;
    if (!['PENDING', 'FLAGGED', 'ESCALATED', 'RE_UPLOAD_REQUESTED'].includes(verification.status)) {
      throw new BadRequestException('Only bills that have not been decided yet can be moved to another outlet.');
    }

    const updated = await this.db.$transaction(async (tx) => {
      await tx.bill.update({ where: { id: verification.billId }, data: { businessId: to.id } });
      return tx.billVerification.update({ where: { id: verification.id }, data: { businessId: to.id } });
    });

    await this.brands.recordEvent({
      tenantId: from.tenantId,
      brandId: from.brandId,
      businessId: to.id,
      actorId,
      type: 'BILL_REASSIGNED',
      summary: `A bill was moved from "${from.name}" to "${to.name}"`,
      metadata: { billId: verification.billId, verificationId, fromBusinessId: from.id, toBusinessId: to.id },
    });
    await this.auditService.log({
      tenantId: verification.tenantId,
      userId: actorId,
      action: 'REASSIGN_BILL_OUTLET',
      resource: 'BILL_VERIFICATION',
      resourceId: verificationId,
      metadata: { billId: verification.billId, fromBusinessId: from.id, toBusinessId: to.id },
    });
    return updated;
  }

  /**
   * Resolve a verification by its unique id. When a businessId is supplied
   * (business-owner actions) we verify the verification belongs to that
   * business — this avoids tenant-mismatch failures because the bill lives in
   * the customer's tenant, not the owner's. Returns the row incl. its own
   * tenantId, which callers must use for downstream tenant-scoped writes.
   */
  private async resolveVerification(verificationId: string, businessId?: string, include?: any) {
    const verification = await this.verificationRepo.findByIdUnsafe(verificationId, include);
    if (!verification) throw new NotFoundException('Verification not found');
    if (businessId && verification.businessId !== businessId) {
      throw new NotFoundException('Verification not found');
    }
    return verification;
  }

  // ── FRAUD ANALYSIS ────────────────────────────────────────────────

  async calculateFraud(tenantId: string, verificationId: string) {
    const verification = await this.resolveVerification(verificationId, undefined, { bill: true });
    const tid = verification.tenantId;

    const score = await this.fraudService.analyzeBill(
      tid,
      verification.bill.businessId,
      verification.bill.userId,
      verification.ocrMetadata,
      verification.billId,
    );

    await this.verificationRepo.update(tid, verification.id, { fraudScore: score });

    // Auto-escalate if fraud score exceeds thresholds
    if (score >= FRAUD_ESCALATE_TO_PLATFORM_THRESHOLD) {
      await this.verificationRepo.update(tid, verification.id, {
        escalationLevel: 'PLATFORM',
        status: 'ESCALATED',
      });
      this.logger.warn(`Bill ${verification.billId} auto-escalated to PLATFORM (fraud score: ${score})`);
    } else if (score >= FRAUD_ESCALATE_TO_OWNER_THRESHOLD) {
      await this.verificationRepo.update(tid, verification.id, {
        escalationLevel: 'BUSINESS',
      });
      this.logger.warn(`Bill ${verification.billId} escalated to BUSINESS_OWNER (fraud score: ${score})`);
    }

    return { fraudScore: score, escalationLevel: score >= FRAUD_ESCALATE_TO_PLATFORM_THRESHOLD ? 'PLATFORM' : score >= FRAUD_ESCALATE_TO_OWNER_THRESHOLD ? 'BUSINESS' : 'NONE' };
  }

  // ── APPROVE ───────────────────────────────────────────────────────

  /**
   * Approve a bill — can be called by BUSINESS_MODERATOR or BUSINESS_OWNER or SUPER_ADMIN.
   * Records actorRole to distinguish moderator vs owner approval.
   */
  async approve(
    tenantId: string,
    verificationId: string,
    actorId: string,
    actorRole: string,
    businessId?: string,
    notes?: string,
  ) {
    const verification = await this.resolveVerification(verificationId, businessId, { bill: true });
    const tid = verification.tenantId;

    const allowedStatuses = ['PENDING', 'FLAGGED', 'RE_UPLOAD_REQUESTED', 'ESCALATED'];
    if (!allowedStatuses.includes(verification.status)) {
      throw new BadRequestException(`Cannot approve a verification in status: ${verification.status}`);
    }

    const isOwnerAction = OWNER_ROLES.includes(actorRole as any);

    const updateData: Record<string, any> = {
      status: 'APPROVED',
      verifiedBy: actorId,
      verifiedAt: new Date(),
      escalationLevel: 'NONE',
    };

    if (isOwnerAction) {
      updateData.ownerOverrideBy = actorId;
      updateData.ownerOverrideAt = new Date();
    } else {
      updateData.moderatorId = actorId;
    }

    const updated = await this.verificationRepo.update(tid, verificationId, updateData);
    // Bill.status has no APPROVED value (that belongs to BillVerification.status); VERIFIED is
    // what the analytics summaries and everything downstream read.
    await this.billRepo.verifyBill(tid, verification.billId, 'VERIFIED', actorId);

    // Create verified purchase record
    await this.verifiedPurchasesService.createVerifiedPurchase(
      tid,
      verification.bill.userId,
      verification.bill.businessId,
      verification.billId,
      Number(verification.bill.amount),
      verification.bill.billDate,
    );
    await this.awardPoints(tid, verification.bill.userId, verification.billId, Number(verification.bill.amount));

    // Notify customer
    await this.notificationsService.send({
      tenantId: tid,
      userId: verification.bill.userId,
      title: 'Bill Approved ✓',
      body: `Your bill has been verified successfully.`,
      type: 'IN_APP',
      channel: 'BUSINESS',
      metadata: { billId: verification.billId, verificationId },
    }).catch(() => {/* non-blocking */});

    await this.auditService.log({
      tenantId: tid,
      userId: actorId,
      action: 'APPROVE_BILL_VERIFICATION',
      resource: 'BILL_VERIFICATION',
      resourceId: verificationId,
      metadata: { billId: verification.billId, actorRole, isOwnerAction },
    });

    // Fire-and-forget summary refresh — bill is now verified so spend totals change
    void this.analyticsSummary.refreshUserSpending(tid, verification.bill.userId).catch(() => {});
    void this.analyticsSummary.refreshBusinessSummary(tid, verification.bill.businessId).catch(() => {});

    return updated;
  }

  // ── REJECT ────────────────────────────────────────────────────────

  async reject(
    tenantId: string,
    verificationId: string,
    actorId: string,
    actorRole: string,
    businessId?: string,
    reason?: string,
  ) {
    const verification = await this.resolveVerification(verificationId, businessId, { bill: true });
    const tid = verification.tenantId;

    const isOwnerAction = OWNER_ROLES.includes(actorRole as any);

    const updateData: Record<string, any> = {
      status: 'REJECTED',
      verifiedBy: actorId,
      verifiedAt: new Date(),
      rejectionReason: reason,
    };

    if (isOwnerAction) {
      updateData.ownerOverrideBy = actorId;
      updateData.ownerOverrideAt = new Date();
    } else {
      updateData.moderatorId = actorId;
    }

    const updated = await this.verificationRepo.update(tid, verificationId, updateData);
    await this.billRepo.verifyBill(tid, verification.billId, 'REJECTED', actorId, reason);

    // Notify customer
    await this.notificationsService.send({
      tenantId: tid,
      userId: verification.bill.userId,
      title: 'Bill Rejected',
      body: `Your bill submission was rejected. Reason: ${reason ?? 'Not provided'}`,
      type: 'IN_APP',
      channel: 'BUSINESS',
      metadata: { billId: verification.billId, reason },
    }).catch(() => {/* non-blocking */});

    await this.auditService.log({
      tenantId: tid,
      userId: actorId,
      action: 'REJECT_BILL_VERIFICATION',
      resource: 'BILL_VERIFICATION',
      resourceId: verificationId,
      metadata: { reason, actorRole },
    });

    return updated;
  }

  // ── FLAG FOR ESCALATION ───────────────────────────────────────────

  async flag(
    tenantId: string,
    verificationId: string,
    actorId: string,
    actorRole: string,
    businessId?: string,
    reason?: string,
  ) {
    const verification = await this.resolveVerification(verificationId, businessId, { bill: true });
    const tid = verification.tenantId;

    // Determine escalation level
    const isOwner = OWNER_ROLES.includes(actorRole as any);
    const newEscalationLevel = isOwner ? 'PLATFORM' : 'BUSINESS';
    const newStatus = isOwner ? 'ESCALATED' : 'FLAGGED';

    const updated = await this.verificationRepo.update(tid, verificationId, {
      status: newStatus,
      rejectionReason: reason,
      escalationLevel: newEscalationLevel,
    });

    this.logger.warn(
      `Bill verification ${verificationId} flagged by ${actorRole} (${actorId}) → escalation: ${newEscalationLevel}`,
    );

    await this.auditService.log({
      tenantId: tid,
      userId: actorId,
      action: 'FLAG_BILL_VERIFICATION',
      resource: 'BILL_VERIFICATION',
      resourceId: verificationId,
      metadata: { reason, actorRole, escalationLevel: newEscalationLevel },
    });

    return updated;
  }

  // ── REQUEST RE-UPLOAD ─────────────────────────────────────────────

  async requestReUpload(
    tenantId: string,
    verificationId: string,
    actorId: string,
    businessId: string,
    reason: string,
  ) {
    const verification = await this.resolveVerification(verificationId, businessId, { bill: true });
    const tid = verification.tenantId;

    const updated = await this.verificationRepo.update(tid, verificationId, {
      status: 'RE_UPLOAD_REQUESTED',
      rejectionReason: reason,
      reUploadRequestedAt: new Date(),
    });

    // Bill.status has no RE_UPLOAD_REQUESTED; the re-upload state lives on the verification row.
    await this.billRepo.update(tid, verification.billId, { status: 'UPLOADED' });

    await this.notificationsService.send({
      tenantId: tid,
      userId: verification.bill.userId,
      title: 'Re-Upload Required',
      body: `Please re-upload your bill. Reason: ${reason}`,
      type: 'IN_APP',
      channel: 'BUSINESS',
      metadata: { billId: verification.billId, reason },
    }).catch(() => {/* non-blocking */});


    await this.auditService.log({
      tenantId: tid,
      userId: actorId,
      action: 'REQUEST_REUPLOAD_BILL',
      resource: 'BILL_VERIFICATION',
      resourceId: verificationId,
      metadata: { reason, businessId },
    });

    return updated;
  }

  // ── OWNER OVERRIDE ────────────────────────────────────────────────

  /**
   * BUSINESS_OWNER can override a BUSINESS_MODERATOR decision.
   * This creates an immutable audit trail of the override.
   */
  async ownerOverride(
    tenantId: string,
    verificationId: string,
    ownerId: string,
    businessId: string,
    decision: 'APPROVED' | 'REJECTED',
    reason?: string,
  ) {
    const verification = await this.resolveVerification(verificationId, businessId, { bill: true });
    const tid = verification.tenantId;

    const updated = await this.verificationRepo.update(tid, verificationId, {
      status: decision,
      ownerOverrideBy: ownerId,
      ownerOverrideAt: new Date(),
      verifiedBy: ownerId,
      verifiedAt: new Date(),
      rejectionReason: decision === 'REJECTED' ? reason : null,
      escalationLevel: 'NONE',
    });

    await this.billRepo.verifyBill(
      tid,
      verification.billId,
      decision === 'APPROVED' ? 'VERIFIED' : 'REJECTED',
      ownerId,
      reason,
    );

    if (decision === 'APPROVED') {
      await this.verifiedPurchasesService.createVerifiedPurchase(
        tid,
        verification.bill.userId,
        verification.bill.businessId,
        verification.billId,
        Number(verification.bill.amount),
        verification.bill.billDate,
      ).catch(() => {/* Already exists — no-op */});
      await this.awardPoints(tid, verification.bill.userId, verification.billId, Number(verification.bill.amount));
    }

    await this.auditService.log({
      tenantId: tid,
      userId: ownerId,
      action: 'OWNER_OVERRIDE_BILL_VERIFICATION',
      resource: 'BILL_VERIFICATION',
      resourceId: verificationId,
      metadata: { decision, reason, businessId, previousStatus: verification.status },
    });

    return { ...updated, ownerOverride: true };
  }

  // ── PLATFORM ESCALATION QUEUE ─────────────────────────────────────

  /**
   * Returns bills escalated to platform level — visible to MASTER_ADMIN (read-only) and SUPER_ADMIN.
   */
  async getEscalatedQueue(tenantId: string, page = 1, limit = 20, actorRole?: string) {
    const pagination = new PaginationParamsDto();
    pagination.page = page;
    pagination.limit = limit;
    pagination.sortBy = 'createdAt';
    pagination.sortOrder = SortOrder.ASC;

    const result = await this.verificationRepo.findMany(
      tenantId,
      { escalationLevel: 'PLATFORM' },
      pagination,
      {
        include: {
          bill: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              business: { select: { id: true, name: true } },
            },
          },
        },
      },
    );

    if (actorRole !== 'SUPER_ADMIN' && result?.data) {
      result.data = result.data.map((v: any) => {
        if (v.bill?.user) {
          const userCopy = { ...v.bill.user };
          delete userCopy.email;
          delete userCopy.phone;
          return {
            ...v,
            bill: {
              ...v.bill,
              user: userCopy,
            },
          };
        }
        return v;
      });
    }

    return result;
  }
}
