import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../../common/storage/storage.service';
import { CreatePaymentDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  async createPayment(userId: string, tenantId: string, businessId: string, dto: CreatePaymentDto) {
    const business = await this.db.business.findFirst({
      where: { id: businessId, tenantId },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');

    const payment = await this.db.payment.create({
      data: {
        tenantId,
        businessId,
        subscriptionId: dto.subscriptionId || null,
        amount: dto.amount,
        method: dto.method,
        status: 'PENDING',
        transactionRef: dto.transactionRef || null,
        proofUrl: dto.proofUrl || null,
        invoiceMetadata: {
          generatedBy: userId,
          billingEmail: business.email,
          packageName: dto.packageName || null,
        },
      },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'PAYMENT_SUBMITTED',
      resource: 'PAYMENT',
      resourceId: payment.id,
      metadata: { method: dto.method, amount: dto.amount },
    });

    return payment;
  }

  async verifyPayment(adminId: string, tenantId: string, paymentId: string) {
    // Payments live in the paying business's tenant, which is not the admin's
    // tenant. Look up by id, then use the payment's own tenantId for writes.
    const payment = await this.db.payment.findFirst({
      where: { id: paymentId, deletedAt: null },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    const updated = await this.db.payment.update({
      where: { id: paymentId },
      data: {
        status: 'SUCCESS',
        verifiedAt: new Date(),
        verifiedBy: adminId,
        rejectionReason: null,
      },
    });

    // If subscription is linked, activate the subscription
    if (payment.subscriptionId) {
      await this.db.subscription.update({
        where: { id: payment.subscriptionId },
        data: { status: 'ACTIVE' },
      });
    }

    await this.audit.log({
      tenantId: payment.tenantId,
      userId: adminId,
      action: 'PAYMENT_VERIFIED',
      resource: 'PAYMENT',
      resourceId: paymentId,
      metadata: { amount: payment.amount, method: payment.method },
    });

    return updated;
  }

  async rejectPayment(adminId: string, tenantId: string, paymentId: string, reason: string) {
    const payment = await this.db.payment.findFirst({
      where: { id: paymentId, deletedAt: null },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    const updated = await this.db.payment.update({
      where: { id: paymentId },
      data: { status: 'FAILED', rejectionReason: reason, verifiedBy: adminId, verifiedAt: new Date() },
    });

    if (payment.subscriptionId) {
      await this.db.subscription.update({
        where: { id: payment.subscriptionId },
        data: { status: 'PENDING_PAYMENT' },
      });
    }

    await this.audit.log({
      tenantId: payment.tenantId,
      userId: adminId,
      action: 'PAYMENT_REJECTED',
      resource: 'PAYMENT',
      resourceId: paymentId,
      metadata: { reason },
    });

    return updated;
  }

  /** Admin queue — pending QR/UPI payments awaiting screenshot review, all tenants. */
  async listPending() {
    const payments = await this.db.payment.findMany({
      where: { status: 'PENDING', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        business: { select: { id: true, name: true, slug: true, city: true } },
        subscription: { select: { id: true, packageName: true, pricing: true } },
      },
      take: 200,
    });

    // proofUrl is stored as {"bucket","path"} against a private bucket — hand
    // the admin a short-lived signed URL so the screenshot actually renders.
    return Promise.all(
      payments.map(async (p) => {
        let proofSignedUrl: string | null = null;
        if (p.proofUrl) {
          try {
            const parsed = JSON.parse(p.proofUrl);
            proofSignedUrl = await this.storage.createSignedDownloadUrl(
              parsed.bucket,
              parsed.path,
              900,
            );
          } catch {
            proofSignedUrl = null;
          }
        }
        return { ...p, proofSignedUrl };
      }),
    );
  }

  async getPayments(userId: string, tenantId: string, businessId: string) {
    const business = await this.db.business.findFirst({
      where: { id: businessId, tenantId },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');

    return this.db.payment.findMany({
      where: { tenantId, businessId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async handleWebhookPlaceholder(body: any, signature: string) {
    // This serves as the Razorpay webhook verification placeholder
    // Real implementation would verify crypto signature
    return { status: 'received', message: 'Signature validation placeholder executed.' };
  }
}
