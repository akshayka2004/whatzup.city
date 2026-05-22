import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class FraudService {
  private readonly logger = new Logger(FraudService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Calculates a fraud score between 0.00 and 1.00 (1.00 = 100% likely fraud)
   */
  async analyzeBill(
    tenantId: string,
    businessId: string,
    userId: string,
    ocrMetadata: any,
  ): Promise<number> {
    let fraudScore = 0;
    this.logger.debug(`Starting fraud analysis for user: ${userId}, business: ${businessId}`);

    // Rule 1: Duplicate invoice number across the same business
    if (ocrMetadata?.parsed?.invoiceNumber) {
      const existing = await this.db.billVerification.findFirst({
        where: {
          tenantId,
          bill: { businessId },
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
