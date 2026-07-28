import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../../common/storage/storage.service';
import { CreatePaymentDto } from './dto/payment.dto';

/** Mirrors the web pricing helper — plan prices are GST-exclusive. */
export const TAX_PERCENT = 18;

/**
 * Split a GST-inclusive total back into base + tax for invoicing. Tax is
 * derived from the total so base + tax always equals what was actually paid,
 * with no rounding drift.
 */
export function splitTax(total: number) {
  const t = Math.max(0, Math.round(Number(total) || 0));
  const base = Math.round(t / (1 + TAX_PERCENT / 100));
  return { base, tax: t - base, total: t };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

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

    // First payment rides along with registration approval; anything after a
    // verified one is a renewal and goes to the payment-approval queue.
    const cycle = await this.resolveCycle(businessId);
    const { base, tax, total } = splitTax(Number(dto.amount));

    const payment = await this.db.payment.create({
      data: {
        tenantId,
        businessId,
        subscriptionId: dto.subscriptionId || null,
        amount: total,
        method: dto.method,
        status: 'PENDING',
        transactionRef: dto.transactionRef || null,
        proofUrl: dto.proofUrl || null,
        invoiceMetadata: {
          generatedBy: userId,
          billingEmail: business.email,
          packageName: dto.packageName || null,
          cycle,
          amountBase: base,
          amountTax: tax,
          taxPercent: TAX_PERCENT,
        },
      },
    });

    await this.recordTransaction({
      tenantId,
      businessId,
      paymentId: payment.id,
      subscriptionId: dto.subscriptionId || null,
      type: 'PAYMENT_SUBMITTED',
      cycle,
      packageName: dto.packageName || null,
      base,
      tax,
      total,
      method: dto.method,
      reference: dto.transactionRef || null,
      status: 'PENDING',
      createdBy: userId,
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'PAYMENT_SUBMITTED',
      resource: 'PAYMENT',
      resourceId: payment.id,
      metadata: { method: dto.method, amount: total, cycle },
    });

    return payment;
  }

  /** NEW until the business has one verified payment; RENEWAL from then on. */
  private async resolveCycle(businessId: string): Promise<'NEW' | 'RENEWAL'> {
    const verified = await this.db.payment.count({
      where: { businessId, status: 'SUCCESS', deletedAt: null },
    });
    return verified > 0 ? 'RENEWAL' : 'NEW';
  }

  /** Append-only financial log entry. Never throws into the caller's path. */
  private async recordTransaction(t: {
    tenantId: string; businessId: string; paymentId?: string | null;
    subscriptionId?: string | null; type: string; cycle: string;
    packageName?: string | null; base: number; tax: number; total: number;
    method?: string | null; reference?: string | null; status: string;
    note?: string | null; createdBy?: string | null;
  }) {
    try {
      await this.db.transaction.create({
        data: {
          tenantId: t.tenantId,
          businessId: t.businessId,
          paymentId: t.paymentId || null,
          subscriptionId: t.subscriptionId || null,
          type: t.type,
          cycle: t.cycle,
          packageName: t.packageName || null,
          amountBase: t.base,
          amountTax: t.tax,
          amountTotal: t.total,
          taxPercent: TAX_PERCENT,
          method: t.method || null,
          reference: t.reference || null,
          status: t.status,
          note: t.note || null,
          createdBy: t.createdBy || null,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to write transaction log: ${err.message}`);
    }
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

    const meta: any = payment.invoiceMetadata || {};
    const split = splitTax(Number(payment.amount));
    await this.recordTransaction({
      tenantId: payment.tenantId,
      businessId: payment.businessId,
      paymentId: payment.id,
      subscriptionId: payment.subscriptionId,
      type: 'PAYMENT_VERIFIED',
      cycle: meta.cycle || 'NEW',
      packageName: meta.packageName || null,
      base: meta.amountBase ?? split.base,
      tax: meta.amountTax ?? split.tax,
      total: split.total,
      method: payment.method,
      reference: payment.transactionRef,
      status: 'SUCCESS',
      createdBy: adminId,
    });

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

    const rmeta: any = payment.invoiceMetadata || {};
    const rsplit = splitTax(Number(payment.amount));
    await this.recordTransaction({
      tenantId: payment.tenantId,
      businessId: payment.businessId,
      paymentId: payment.id,
      subscriptionId: payment.subscriptionId,
      type: 'PAYMENT_REJECTED',
      cycle: rmeta.cycle || 'NEW',
      packageName: rmeta.packageName || null,
      base: rmeta.amountBase ?? rsplit.base,
      tax: rmeta.amountTax ?? rsplit.tax,
      total: rsplit.total,
      method: payment.method,
      reference: payment.transactionRef,
      status: 'FAILED',
      note: reason,
      createdBy: adminId,
    });

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

  /**
   * Admin queue of pending payments across tenants.
   *
   * `cycle` filters what surfaces where: a new business's first payment is
   * reviewed alongside its documents in Approvals, so the Payment Approvals
   * screen asks for RENEWAL only.
   */
  async listPending(cycle?: 'NEW' | 'RENEWAL') {
    const payments = await this.db.payment.findMany({
      where: { status: 'PENDING', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
          select: {
            id: true, name: true, slug: true, city: true, status: true,
            billingProfile: true,
          },
        },
        subscription: { select: { id: true, packageName: true, pricing: true, endDate: true, duration: true } },
      },
      take: 200,
    });

    const filtered = cycle
      ? payments.filter((p) => (((p.invoiceMetadata as any) || {}).cycle || 'NEW') === cycle)
      : payments;

    // proofUrl is stored as {"bucket","path"} against a private bucket — hand
    // the admin a short-lived signed URL so the screenshot actually renders.
    return Promise.all(
      filtered.map(async (p) => {
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
        const meta: any = p.invoiceMetadata || {};
        const split = splitTax(Number(p.amount));
        return {
          ...p,
          proofSignedUrl,
          cycle: meta.cycle || 'NEW',
          amountBase: meta.amountBase ?? split.base,
          amountTax: meta.amountTax ?? split.tax,
          amountTotal: split.total,
          taxPercent: TAX_PERCENT,
        };
      }),
    );
  }

  /** Full financial log for a business — admin/finance view. */
  async listTransactions(businessId?: string) {
    return this.db.transaction.findMany({
      where: businessId ? { businessId } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        business: { select: { id: true, name: true, city: true } },
      },
      take: 500,
    });
  }

  /** Invoice/billing details, upserted by the business owner. */
  async upsertBillingProfile(userId: string, tenantId: string, businessId: string, dto: any) {
    const business = await this.db.business.findFirst({
      where: { tenantId, OR: [{ id: businessId }, { entityId: businessId }] },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');

    const data = {
      billingName: dto.billingName,
      hasGst: !!dto.hasGst,
      gstin: dto.hasGst ? dto.gstin || null : null,
      pan: dto.pan || null,
      addressLine: dto.addressLine,
      city: dto.city || null,
      state: dto.state || null,
      pincode: dto.pincode,
      invoiceEmail: dto.invoiceEmail,
    };

    return this.db.billingProfile.upsert({
      where: { businessId: business.id },
      update: data,
      create: { ...data, tenantId: business.tenantId, businessId: business.id },
    });
  }

  async getBillingProfile(userId: string, tenantId: string, businessId: string) {
    const business = await this.db.business.findFirst({
      where: { tenantId, OR: [{ id: businessId }, { entityId: businessId }] },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');
    return this.db.billingProfile.findUnique({ where: { businessId: business.id } });
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
