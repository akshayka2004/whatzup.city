import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class FraudService {
  private readonly logger = new Logger(FraudService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Other live bills with the same (normalised) invoice number inside `businessIds` — one business,
   * or every outlet of a brand that shares a bill series. Rejected bills don't count, so a customer
   * can resubmit after a rejection. Cross-tenant on purpose: bills live in the customer's tenant.
   */
  async findDuplicateBills(params: { billId: string; billNumber: string; businessIds: string[] }) {
    // tenant-scope-ok: bills are stored under each customer's own tenant; businessIds is the scope
    return this.db.bill.findMany({
      where: {
        id: { not: params.billId },
        businessId: { in: params.businessIds },
        billNumber: params.billNumber,
        deletedAt: null,
        status: { not: 'REJECTED' },
        // A bill the moderator sent back for re-upload is being replaced, so its replacement
        // (usually the same invoice number) must not be flagged as a duplicate of it.
        NOT: { verifications: { some: { status: 'RE_UPLOAD_REQUESTED' } } },
      },
      select: { id: true, businessId: true, createdAt: true, business: { select: { name: true, outletLabel: true } } },
      orderBy: { createdAt: 'asc' },
      take: 3,
    });
  }

  /**
   * Calculates a fraud score between 0.00 and 1.00 (1.00 = 100% likely fraud)
   */
  async analyzeBill(
    tenantId: string,
    businessId: string,
    userId: string,
    ocrMetadata: any,
    billId?: string,
  ): Promise<number> {
    let fraudScore = 0;
    this.logger.debug(`Starting fraud analysis for user: ${userId}, business: ${businessId}`);

    // Rule 1: Duplicate invoice number across the same business
    if (ocrMetadata?.parsed?.invoiceNumber) {
      const existing = await this.db.billVerification.findFirst({
        where: {
          tenantId,
          // Never count the bill under analysis as its own duplicate.
          bill: { businessId, ...(billId ? { id: { not: billId } } : {}) },
          ocrMetadata: {
            path: ['parsed', 'invoiceNumber'],
            equals: ocrMetadata.parsed.invoiceNumber,
          },
        },
      });

      if (existing) {
        this.logger.warn(`Duplicate invoice number detected: ${ocrMetadata.parsed.invoiceNumber}`);
        fraudScore += 0.6; // High indicator of fraud
      }
    }

    // Rule 2: Low OCR confidence implies possible blurry / manipulated image
    if (ocrMetadata?.confidence !== undefined && ocrMetadata.confidence < 60) {
      fraudScore += 0.3; // Adds a medium warning
    }

    // Rule 3: High-frequency uploads from the same user (e.g., > 3 bills in the last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentUploads = await this.db.bill.count({
      where: { tenantId, userId, createdAt: { gte: tenMinutesAgo } },
    });

    if (recentUploads > 3) {
      fraudScore += 0.4;
    }

    return Math.min(fraudScore, 1.0); // Cap at 1.0 (100%)
  }
}
