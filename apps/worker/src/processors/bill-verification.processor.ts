import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';
import { BillStatus } from '@saas/types';

@Injectable()
export class BillVerificationProcessor {
  private readonly logger = new Logger(BillVerificationProcessor.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Process and verify a single bill record
   */
  async processBill(billId: string): Promise<void> {
    this.logger.log(`Starting OCR verification for bill: ${billId}`);

    try {
      const bill = await this.db.bill.findUnique({
        where: { id: billId },
      });

      if (!bill) {
        this.logger.warn(`Bill not found: ${billId}`);
        return;
      }

      if (bill.status !== BillStatus.UPLOADED && bill.status !== BillStatus.PROCESSING) {
        this.logger.warn(`Bill ${billId} is already processed with status: ${bill.status}`);
        return;
      }

      // Mock OCR latency
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const billAmount = bill.amount ? Number(bill.amount) : 0;
      // Auto-verify if the amount matches rules, otherwise flag for manual review
      const isVerified = billAmount > 0 && billAmount < 10000;

      await this.db.bill.update({
        where: { id: billId },
        data: {
          status: isVerified ? BillStatus.VERIFIED : BillStatus.REJECTED,
          rejectionReason: isVerified ? null : 'OCR Failed: High amount or invalid bill format',
        },
      });

      this.logger.log(
        `Successfully processed bill: ${billId} -> ${isVerified ? 'VERIFIED' : 'REJECTED'}`,
      );
    } catch (error) {
      this.logger.error(`Error processing bill ${billId}:`, error);
    }
  }
}
