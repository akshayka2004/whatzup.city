import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { BillVerificationRepository } from '../../common/database/repositories/bill-verification.repository';
import { BillRepository } from '../../common/database/repositories/bill.repository';
import { FraudService } from '../fraud/fraud.service';
import { AuditService } from '../audit/audit.service';
import { VerifiedPurchasesService } from '../verified-purchases/verified-purchases.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaginationParamsDto, SortOrder } from '../../common/database/pagination/pagination.dto';

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
  ) {}

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

    const filters: Record<string, any> = { businessId };
    if (status) filters.status = status;
    else filters.status = 'PENDING';

    const result = await this.verificationRepo.findMany(tenantId, filters, pagination, {
      include: {
        bill: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            business: { select: { id: true, name: true } },
            items: true,
          },
        },
      },
    });

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

  // ── FRAUD ANALYSIS ────────────────────────────────────────────────

  async calculateFraud(tenantId: string, verificationId: string) {
    const verification = await this.verificationRepo.findOne(tenantId, verificationId, {
      include: { bill: true },
    });
    if (!verification) throw new NotFoundException('Verification not found');

    const score = await this.fraudService.analyzeBill(
      tenantId,
      verification.bill.businessId,
      verification.bill.userId,
      verification.ocrMetadata,
    );

    await this.verificationRepo.update(tenantId, verification.id, { fraudScore: score });

    // Auto-escalate if fraud score exceeds thresholds
    if (score >= FRAUD_ESCALATE_TO_PLATFORM_THRESHOLD) {
      await this.verificationRepo.update(tenantId, verification.id, {
        escalationLevel: 'PLATFORM',
        status: 'ESCALATED',
      });
      this.logger.warn(`Bill ${verification.billId} auto-escalated to PLATFORM (fraud score: ${score})`);
    } else if (score >= FRAUD_ESCALATE_TO_OWNER_THRESHOLD) {
      await this.verificationRepo.update(tenantId, verification.id, {
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
    const verification = await this.verificationRepo.findOne(tenantId, verificationId, {
      include: { bill: true },
    });
    if (!verification) throw new NotFoundException('Verification not found');

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

    const updated = await this.verificationRepo.update(tenantId, verificationId, updateData);
    await this.billRepo.verifyBill(tenantId, verification.billId, 'APPROVED', actorId);

    // Create verified purchase record
    await this.verifiedPurchasesService.createVerifiedPurchase(
      tenantId,
      verification.bill.userId,
      verification.bill.businessId,
      verification.billId,
      Number(verification.bill.amount),
      verification.bill.billDate,
    );

    // Notify customer
    await this.notificationsService.send({
      tenantId,
      userId: verification.bill.userId,
      title: 'Bill Approved ✓',
      body: `Your bill has been verified successfully.`,
      type: 'IN_APP',
      channel: 'BUSINESS',
      metadata: { billId: verification.billId, verificationId },
    }).catch(() => {/* non-blocking */});

    await this.auditService.log({
      tenantId,
      userId: actorId,
      action: 'APPROVE_BILL_VERIFICATION',
      resource: 'BILL_VERIFICATION',
      resourceId: verificationId,
      metadata: { billId: verification.billId, actorRole, isOwnerAction },
    });

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
    const verification = await this.verificationRepo.findOne(tenantId, verificationId, {
      include: { bill: true },
    });
    if (!verification) throw new NotFoundException('Verification not found');

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

    const updated = await this.verificationRepo.update(tenantId, verificationId, updateData);
    await this.billRepo.verifyBill(tenantId, verification.billId, 'REJECTED', actorId, reason);

    // Notify customer
    await this.notificationsService.send({
      tenantId,
      userId: verification.bill.userId,
      title: 'Bill Rejected',
      body: `Your bill submission was rejected. Reason: ${reason ?? 'Not provided'}`,
      type: 'IN_APP',
      channel: 'BUSINESS',
      metadata: { billId: verification.billId, reason },
    }).catch(() => {/* non-blocking */});

    await this.auditService.log({
      tenantId,
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
    const verification = await this.verificationRepo.findOne(tenantId, verificationId, {
      include: { bill: true },
    });
    if (!verification) throw new NotFoundException('Verification not found');

    // Determine escalation level
    const isOwner = OWNER_ROLES.includes(actorRole as any);
    const newEscalationLevel = isOwner ? 'PLATFORM' : 'BUSINESS';
    const newStatus = isOwner ? 'ESCALATED' : 'FLAGGED';

    const updated = await this.verificationRepo.update(tenantId, verificationId, {
      status: newStatus,
      rejectionReason: reason,
      escalationLevel: newEscalationLevel,
    });

    this.logger.warn(
      `Bill verification ${verificationId} flagged by ${actorRole} (${actorId}) → escalation: ${newEscalationLevel}`,
    );

    await this.auditService.log({
      tenantId,
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
    const verification = await this.verificationRepo.findOne(tenantId, verificationId, {
      include: { bill: true },
    });
    if (!verification) throw new NotFoundException('Verification not found');

    const updated = await this.verificationRepo.update(tenantId, verificationId, {
      status: 'RE_UPLOAD_REQUESTED',
      rejectionReason: reason,
      reUploadRequestedAt: new Date(),
    });

    await this.billRepo.update(tenantId, verification.billId, { status: 'RE_UPLOAD_REQUESTED' });

    await this.notificationsService.send({
      tenantId,
      userId: verification.bill.userId,
      title: 'Re-Upload Required',
      body: `Please re-upload your bill. Reason: ${reason}`,
      type: 'IN_APP',
      channel: 'BUSINESS',
      metadata: { billId: verification.billId, reason },
    }).catch(() => {/* non-blocking */});


    await this.auditService.log({
      tenantId,
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
    const verification = await this.verificationRepo.findOne(tenantId, verificationId, {
      include: { bill: true },
    });
    if (!verification) throw new NotFoundException('Verification not found');

    const updated = await this.verificationRepo.update(tenantId, verificationId, {
      status: decision,
      ownerOverrideBy: ownerId,
      ownerOverrideAt: new Date(),
      verifiedBy: ownerId,
      verifiedAt: new Date(),
      rejectionReason: decision === 'REJECTED' ? reason : null,
      escalationLevel: 'NONE',
    });

    await this.billRepo.verifyBill(
      tenantId,
      verification.billId,
      decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
      ownerId,
      reason,
    );

    if (decision === 'APPROVED') {
      await this.verifiedPurchasesService.createVerifiedPurchase(
        tenantId,
        verification.bill.userId,
        verification.bill.businessId,
        verification.billId,
        Number(verification.bill.amount),
        verification.bill.billDate,
      ).catch(() => {/* Already exists — no-op */});
    }

    await this.auditService.log({
      tenantId,
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
