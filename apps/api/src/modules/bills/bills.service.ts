import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BillRepository } from '../../common/database/repositories/bill.repository';
import { BillVerificationRepository } from '../../common/database/repositories/bill-verification.repository';
import { AuditService } from '../audit/audit.service';
import { PaginationParamsDto, SortOrder } from '../../common/database/pagination/pagination.dto';

@Injectable()
export class BillsService {
  private readonly logger = new Logger(BillsService.name);

  constructor(
    private readonly billRepo: BillRepository,
    private readonly verificationRepo: BillVerificationRepository,
    private readonly auditService: AuditService,
    @InjectQueue('ocr-queue') private readonly ocrQueue: Queue,
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
    // 1. Create the Bill Record
    const bill = await this.billRepo.create(tenantId, {
      userId,
      businessId: data.businessId,
      amount: data.amount,
      billDate: new Date(data.billDate),
      billImage: data.billImage,
      description: data.description,
      status: 'UPLOADED',
    });

    // 2. Automatically create a Pending Verification tracker
    await this.verificationRepo.create(tenantId, {
      billId: bill.id,
      status: 'PENDING',
    });

    // 3. Dispatch to OCR Background Worker
    await this.ocrQueue.add('extract-text', {
      tenantId,
      billId: bill.id,
      imageUrl: data.billImage,
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
