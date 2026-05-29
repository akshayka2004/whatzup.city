import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { VerificationRepository } from '../../common/database/repositories/verification.repository';
import { BusinessRepository } from '../../common/database/repositories/business.repository';
import { AuditService } from '../audit/audit.service';
import { TrialsService } from '../trials/trials.service';
import { BusinessStatus } from '@saas/types';
import { PaginationParamsDto, SortOrder } from '../../common/database/pagination/pagination.dto';

@Injectable()
export class VerificationService {
  constructor(
    private readonly verificationRepo: VerificationRepository,
    private readonly businessRepo: BusinessRepository,
    private readonly auditService: AuditService,
    private readonly trialsService: TrialsService,
  ) {}

  async submitRequest(tenantId: string, businessId: string, userId: string) {
    const business = await this.businessRepo.findOne(tenantId, businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    if (business.status === BusinessStatus.APPROVED) {
      throw new BadRequestException('Business is already verified');
    }

    // Check for existing pending request
    const existing = await this.verificationRepo.findMany(
      tenantId,
      { businessId, status: 'PENDING' },
      { page: 1, limit: 1 } as any,
    );

    if (existing.data.length > 0) {
      throw new BadRequestException('Verification request is already pending');
    }

    const verification = await this.verificationRepo.create(tenantId, {
      businessId,
      status: 'PENDING',
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'SUBMIT_VERIFICATION',
      resource: 'BUSINESS_VERIFICATION',
      resourceId: verification.id,
      metadata: { businessId },
    });

    return verification;
  }

  async getPendingRequests(tenantId: string, page = 1, limit = 20) {
    const pagination = new PaginationParamsDto();
    pagination.page = page;
    pagination.limit = limit;
    pagination.sortBy = 'createdAt';
    pagination.sortOrder = SortOrder.ASC;

    return this.verificationRepo.findMany(tenantId, { status: 'PENDING' }, pagination, {
      include: {
        business: {
          select: { id: true, name: true, owner: { select: { name: true, email: true } } },
        },
      },
    });
  }

  async approveRequest(tenantId: string, verificationId: string, adminId: string) {
    const verification = await this.verificationRepo.findOne(tenantId, verificationId);
    if (!verification) {
      throw new NotFoundException('Verification request not found');
    }

    const updatedVerification = await this.verificationRepo.update(tenantId, verificationId, {
      status: 'APPROVED',
      verifiedBy: adminId,
      verifiedAt: new Date(),
    });

    const updatedBusiness = await this.businessRepo.updateStatus(
      tenantId,
      verification.businessId,
      BusinessStatus.APPROVED,
    );

    // Start 15-day free trial for approved business (Release 1)
    await this.trialsService.startTrial(
      tenantId,
      verification.businessId,
      updatedBusiness.ownerId,
    );

    await this.auditService.log({
      tenantId,
      userId: adminId,
      action: 'APPROVE_VERIFICATION',
      resource: 'BUSINESS_VERIFICATION',
      resourceId: verificationId,
      metadata: { businessId: verification.businessId },
    });

    return updatedVerification;
  }

  async rejectRequest(tenantId: string, verificationId: string, adminId: string, reason: string) {
    const verification = await this.verificationRepo.findOne(tenantId, verificationId);
    if (!verification) {
      throw new NotFoundException('Verification request not found');
    }

    const updatedVerification = await this.verificationRepo.update(tenantId, verificationId, {
      status: 'REJECTED',
      rejectionReason: reason,
      verifiedBy: adminId,
      verifiedAt: new Date(),
    });

    await this.businessRepo.updateStatus(
      tenantId,
      verification.businessId,
      BusinessStatus.REJECTED,
    );

    await this.auditService.log({
      tenantId,
      userId: adminId,
      action: 'REJECT_VERIFICATION',
      resource: 'BUSINESS_VERIFICATION',
      resourceId: verificationId,
      metadata: { businessId: verification.businessId, reason },
    });

    return updatedVerification;
  }
}
