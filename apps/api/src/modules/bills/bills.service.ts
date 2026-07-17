import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BillRepository } from '../../common/database/repositories/bill.repository';
import { BillVerificationRepository } from '../../common/database/repositories/bill-verification.repository';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../../common/storage/storage.service';
import { PaginationParamsDto, SortOrder } from '../../common/database/pagination/pagination.dto';
import { BusinessCustomerService } from '../customers/business-customer.service';
import { AnalyticsSummaryService } from '../analytics/analytics-summary.service';
import { DatabaseService } from '../../common/database/database.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BillsService {
  private readonly logger = new Logger(BillsService.name);

  constructor(
    private readonly billRepo: BillRepository,
    private readonly verificationRepo: BillVerificationRepository,
    private readonly auditService: AuditService,
    private readonly storageService: StorageService,
    @InjectQueue('ocr-queue') private readonly ocrQueue: Queue,
    private readonly businessCustomerService: BusinessCustomerService,
    private readonly analyticsSummary: AnalyticsSummaryService,
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
  ) {}

  async upload(
    tenantId: string,
    userId: string,
    data: {
      businessId: string;
      amount: number;
      billDate: string;
      billImage: string;
      description?: string;
    },
  ) {
    const dbUrl = data.billImage.startsWith('{')
      ? data.billImage
      : JSON.stringify({ bucket: 'bill-uploads', path: data.billImage });

    // 1. Create the Bill Record
    const bill = await this.billRepo.create(tenantId, {
      userId,
      businessId: data.businessId,
      amount: data.amount,
      billDate: new Date(data.billDate),
      billImage: dbUrl,
      description: data.description,
      status: 'UPLOADED',
    });

    // 2. Automatically create a Pending Verification tracker
    // IMPORTANT: businessId must be set so getBusinessQueue() can find the verification.
    await this.verificationRepo.create(tenantId, {
      billId: bill.id,
      businessId: data.businessId,
      status: 'PENDING',
    });

    // 2b. Notify the business owner (in the business's own tenant so it lands
    // in their notification feed) that a bill awaits moderation.
    try {
      const biz = await this.db.business.findFirst({
        where: { OR: [{ id: data.businessId }, { entityId: data.businessId }] },
        select: { id: true, ownerId: true, tenantId: true },
      });
      if (biz?.ownerId) {
        await this.notifications.send({
          tenantId: biz.tenantId,
          userId: biz.ownerId,
          title: 'New Bill Submitted',
          body: `A customer submitted a bill of ₹${data.amount} for verification.`,
          type: 'IN_APP',
          channel: 'BUSINESS',
          metadata: { billId: bill.id, businessId: biz.id },
        });
      }
    } catch {
      /* non-blocking — notification failure must not fail the upload */
    }

    // Generate signed download URL for background OCR worker to access private file
    let signedUrl = '';
    try {
      const parsed = JSON.parse(dbUrl);
      signedUrl = await this.storageService.createSignedDownloadUrl(parsed.bucket, parsed.path, 900); // 15 minutes
    } catch (err: any) {
      this.logger.error(`Failed to generate signed download URL for OCR worker: ${err.message}`);
      signedUrl = data.billImage; // Fallback
    }

    // 3. Dispatch to OCR Background Worker
    await this.ocrQueue.add('extract-text', {
      tenantId,
      billId: bill.id,
      imageUrl: signedUrl,
      userId,
    });
    this.logger.debug(`Dispatched OCR job for bill: ${bill.id}`);

    // 4. Log Audit
    await this.auditService.log({
      tenantId,
      userId,
      action: 'UPLOAD_BILL',
      resource: 'BILL',
      resourceId: bill.id,
      metadata: { businessId: data.businessId, amount: data.amount },
    });

    // 5. Track customer-business relationship
    await this.businessCustomerService.trackInteraction(
      tenantId,
      userId,
      data.businessId,
      'BILL_UPLOAD',
    );

    // 6. Fire-and-forget summary refresh (non-blocking)
    void this.analyticsSummary.refreshUserSpending(tenantId, userId).catch(() => {});
    void this.analyticsSummary.refreshBusinessSummary(tenantId, data.businessId).catch(() => {});

    return bill;
  }

  async findByUser(tenantId: string, userId: string, page = 1, limit = 20) {
    const pagination = new PaginationParamsDto();
    pagination.page = page;
    pagination.limit = limit;
    pagination.sortBy = 'createdAt';
    pagination.sortOrder = SortOrder.DESC;

    return this.billRepo.findUserBills(tenantId, userId, pagination);
  }
}
