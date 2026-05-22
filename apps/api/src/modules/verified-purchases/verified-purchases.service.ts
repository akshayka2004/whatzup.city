import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { VerifiedPurchaseRepository } from '../../common/database/repositories/verified-purchase.repository';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class VerifiedPurchasesService {
  private readonly logger = new Logger(VerifiedPurchasesService.name);

  constructor(
    private readonly verifiedPurchaseRepo: VerifiedPurchaseRepository,
    private readonly auditService: AuditService,
  ) {}

  async createVerifiedPurchase(
    tenantId: string,
    userId: string,
    businessId: string,
    billId: string,
    amount: number,
    purchaseDate: Date,
  ) {
    // Check if one already exists for this bill
    const existing = await this.verifiedPurchaseRepo.findByBillId(tenantId, billId);
    if (existing) {
      throw new ConflictException('A verified purchase already exists for this bill');
    }

    const verifiedPurchase = await this.verifiedPurchaseRepo.create(tenantId, {
      userId,
      businessId,
      billId,
      amount,
      purchaseDate,
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'GENERATE_VERIFIED_PURCHASE',
      resource: 'VERIFIED_PURCHASE',
      resourceId: verifiedPurchase.id,
      metadata: { billId, businessId, amount },
    });

    this.logger.log(
      `Verified purchase created for user ${userId} at business ${businessId} via bill ${billId}`,
    );

    return verifiedPurchase;
  }

  async checkReviewEligibility(
    tenantId: string,
    userId: string,
    businessId: string,
  ): Promise<boolean> {
    return this.verifiedPurchaseRepo.checkEligibility(tenantId, userId, businessId);
  }
}
