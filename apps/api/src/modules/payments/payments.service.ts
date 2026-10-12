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
import { CryptoService } from '../../common/crypto/crypto.service';
import { CreatePaymentDto, PurchaseCartDto } from './dto/payment.dto';
import { EntitlementsService } from '../subscriptions/entitlements.service';
import { catalogueItem, cycleDays, priceCart, type BillingCycle } from '@saas/types';
import { mapWithConcurrency } from '../../common/utils/concurrency';

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
    private readonly crypto: CryptoService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async createPayment(userId: string, tenantId: string, businessId: string, dto: CreatePaymentDto) {
    const business = await this.db.business.findFirst({
      where: { id: businessId, tenantId },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');

    // The proof was uploaded straight to storage via a signed URL, so its real
    // content is unverified until now. Check the bytes before an admin ever
    // opens it; rejected files are removed from the bucket.
    if (dto.proofUrl) {
      try {
        const parsed = JSON.parse(dto.proofUrl);
        await this.storage.verifyStoredFile(parsed.bucket, parsed.path, [
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/pdf',
        ]);
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        this.logger.warn(`Could not verify payment proof: ${(err as Error).message}`);
      }
    }

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

  /**
   * Buy a bundle and/or add-on units. The server prices the cart (never trusts a client amount),
   * queues one PENDING_PAYMENT subscription row per line and one payment for the GST-inclusive
   * total; nothing counts as an entitlement until an admin verifies the payment.
   */
  async purchaseCart(userId: string, businessId: string, dto: PurchaseCartDto) {
    const business = await this.db.business.findFirst({
      where: { id: businessId, deletedAt: null },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');

    const priced = priceCart(
      dto.lines.map((l) => ({ code: l.code, quantity: l.quantity })),
      dto.cycle,
    );
    if (!priced.ok) throw new BadRequestException(priced.error);
    const { cart } = priced;

    // Brand outlets pay the per-outlet MULTI price; standalone businesses the SINGLE price.
    for (const l of cart.lines) {
      const item = catalogueItem(l.code);
      if (item?.kind !== 'BASE') continue;
      if (item.outlets === 'MULTI' && !business.brandId) {
        throw new BadRequestException('The multi-outlet plan is for outlets of a brand account.');
      }
      if (item.outlets === 'SINGLE' && business.brandId) {
        throw new BadRequestException('Outlets of a brand account use the multi-outlet plan.');
      }
    }

    if (dto.proofUrl) await this.checkProof(dto.proofUrl);

    const cycle = await this.resolveCycle(businessId);
    const days = cycleDays(dto.cycle as BillingCycle);
    const now = new Date();
    const end = new Date(now.getTime() + days * 86_400_000);
    const { base, tax, total } = cart.totals;

    const { payment, subscriptionIds } = await this.db.$transaction(async (tx) => {
      // A fresh checkout replaces any earlier unpaid one.
      await tx.subscription.updateMany({
        where: { businessId, status: 'PENDING_PAYMENT', deletedAt: null },
        data: { status: 'EXPIRED' },
      });

      const ids: string[] = [];
      for (const l of cart.lines) {
        const item = catalogueItem(l.code)!;
        const sub = await tx.subscription.create({
          data: {
            tenantId: business.tenantId,
            businessId,
            packageName: l.code,
            pricing: l.amount,
            duration: days,
            kind: item.kind,
            billingCycle: dto.cycle,
            quantity: l.quantity,
            featureFlags: {
              offers: item.offers * l.quantity,
              vouchers: item.vouchers * l.quantity,
              analytics: item.analytics,
              pricingV2: true,
            },
            postingLimits: item.offers * l.quantity,
            categoryLimits: 1,
            status: 'PENDING_PAYMENT',
            startDate: now,
            endDate: end,
            createdBy: userId,
          },
        });
        ids.push(sub.id);
      }

      const pay = await tx.payment.create({
        data: {
          tenantId: business.tenantId,
          businessId,
          subscriptionId: ids[0],
          amount: total,
          method: dto.method,
          status: 'PENDING',
          transactionRef: dto.transactionRef || null,
          proofUrl: dto.proofUrl || null,
          invoiceMetadata: {
            generatedBy: userId,
            billingEmail: business.email,
            packageName: cart.lines
              .map((l) => (l.quantity > 1 ? `${l.code} x${l.quantity}` : l.code))
              .join(' + '),
            cycle,
            billingCycle: dto.cycle,
            amountBase: base,
            amountTax: tax,
            taxPercent: TAX_PERCENT,
            cart: {
              cycle: dto.cycle,
              lines: cart.lines.map((l) => ({
                code: l.code,
                quantity: l.quantity,
                unit: l.unit,
                amount: l.amount,
              })),
            },
            subscriptionIds: ids,
          },
        },
      });
      return { payment: pay, subscriptionIds: ids };
    });

    await this.recordTransaction({
      tenantId: business.tenantId,
      businessId,
      paymentId: payment.id,
      subscriptionId: subscriptionIds[0],
      type: 'PAYMENT_SUBMITTED',
      cycle,
      packageName: cart.lines.map((l) => l.code).join(' + '),
      base,
      tax,
      total,
      method: dto.method,
      reference: dto.transactionRef || null,
      status: 'PENDING',
      createdBy: userId,
    });
    await this.audit.log({
      tenantId: business.tenantId,
      userId,
      action: 'PURCHASE_SUBMITTED',
      resource: 'PAYMENT',
      resourceId: payment.id,
      metadata: { cycle: dto.cycle, lines: cart.lines, total },
    });

    return { payment, cart };
  }

  /** Same content check createPayment runs on an uploaded QR/UPI screenshot. */
  private async checkProof(proofUrl: string) {
    try {
      const parsed = JSON.parse(proofUrl);
      await this.storage.verifyStoredFile(parsed.bucket, parsed.path, [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
      ]);
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn(`Could not verify payment proof: ${(err as Error).message}`);
    }
  }

  /**
   * Turn a verified cart payment into live entitlements. Each line replaces what it supersedes:
   * a bundle replaces every live bundle (new or legacy, no pro-rata credit); an add-on replaces
   * live rows of the same code. Same code + same cycle = a renewal, so the paid time carries over.
   */
  private async activateCart(payment: { businessId: string; invoiceMetadata: any }) {
    const ids: string[] = Array.isArray(payment.invoiceMetadata?.subscriptionIds)
      ? payment.invoiceMetadata.subscriptionIds
      : [];
    if (!ids.length) return;
    const now = new Date();
    await this.db.$transaction(async (tx) => {
      const subs = await tx.subscription.findMany({
        where: { id: { in: ids }, businessId: payment.businessId, deletedAt: null },
      });
      for (const sub of subs) {
        const item = catalogueItem(sub.packageName);
        if (!item) continue;
        const live = await tx.subscription.findMany({
          where: {
            businessId: payment.businessId,
            status: 'ACTIVE',
            deletedAt: null,
            endDate: { gte: now },
            id: { notIn: ids },
          },
        });
        const isAddon = (r: { kind: string; packageName: string }) =>
          r.kind === 'ADDON' || r.packageName.startsWith('ADDON_');
        const replaced = live.filter((r) =>
          item.kind === 'BASE' ? !isAddon(r) : r.packageName === sub.packageName,
        );
        const carryFrom = replaced
          .filter((r) => r.packageName === sub.packageName && r.billingCycle === sub.billingCycle)
          .reduce((m, r) => Math.max(m, r.endDate.getTime()), now.getTime());
        if (replaced.length) {
          await tx.subscription.updateMany({
            where: { id: { in: replaced.map((r) => r.id) } },
            data: { status: 'EXPIRED' },
          });
        }
        const days = cycleDays(sub.billingCycle as BillingCycle);
        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            status: 'ACTIVE',
            startDate: now,
            endDate: new Date(carryFrom + days * 86_400_000),
          },
        });
      }
    });
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
    tenantId: string;
    businessId: string;
    paymentId?: string | null;
    subscriptionId?: string | null;
    type: string;
    cycle: string;
    packageName?: string | null;
    base: number;
    tax: number;
    total: number;
    method?: string | null;
    reference?: string | null;
    status: string;
    note?: string | null;
    createdBy?: string | null;
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
    const isCart = Array.isArray((payment.invoiceMetadata as any)?.subscriptionIds);
    // Re-verifying a cart payment would extend the term twice.
    if (isCart && payment.status === 'SUCCESS') return payment;

    const updated = await this.db.payment.update({
      where: { id: paymentId },
      data: {
        status: 'SUCCESS',
        verifiedAt: new Date(),
        verifiedBy: adminId,
        rejectionReason: null,
      },
    });

    if (isCart) {
      await this.activateCart(payment);
    } else if (payment.subscriptionId) {
      // If subscription is linked, activate the subscription
      await this.db.subscription.update({
        where: { id: payment.subscriptionId },
        data: { status: 'ACTIVE' },
      });
    }
    await this.entitlements.invalidate(payment.businessId);

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
      data: {
        status: 'FAILED',
        rejectionReason: reason,
        verifiedBy: adminId,
        verifiedAt: new Date(),
      },
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
    // tenant-scope-ok: admin approval queue spans tenants by design; role-guarded in controller
    const payments = await this.db.payment.findMany({
      where: { status: 'PENDING', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            status: true,
            billingProfile: true,
          },
        },
        subscription: {
          select: { id: true, packageName: true, pricing: true, endDate: true, duration: true },
        },
      },
      take: 200,
    });

    const filtered = cycle
      ? payments.filter((p) => (((p.invoiceMetadata as any) || {}).cycle || 'NEW') === cycle)
      : payments;

    // proofUrl is stored as {"bucket","path"} against a private bucket — hand
    // the admin a short-lived signed URL so the screenshot actually renders.
    return mapWithConcurrency(filtered, 10, async (p) => {
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

      // Identity documents are masked in the list view. Admins reveal them
      // one at a time through the audited endpoint.
      const bp: any = (p.business as any)?.billingProfile;
      const business = bp
        ? {
            ...p.business,
            billingProfile: {
              ...bp,
              pan: CryptoService.mask(this.crypto.decrypt(bp.pan)),
              gstin: CryptoService.mask(this.crypto.decrypt(bp.gstin)),
              masked: true,
            },
          }
        : p.business;

      return {
        ...p,
        business,
        proofSignedUrl,
        cycle: meta.cycle || 'NEW',
        amountBase: meta.amountBase ?? split.base,
        amountTax: meta.amountTax ?? split.tax,
        amountTotal: split.total,
        taxPercent: TAX_PERCENT,
      };
    });
  }

  /** Full financial log for a business — admin/finance view. */
  async listTransactions(businessId?: string) {
    // tenant-scope-ok: admin financial log spans tenants by design; role-guarded in controller
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

    // PAN/GSTIN are identity documents — encrypted at rest so a DB dump alone
    // doesn't expose them.
    const data = {
      billingName: dto.billingName,
      hasGst: !!dto.hasGst,
      gstin: dto.hasGst ? this.crypto.encrypt(dto.gstin) : null,
      pan: this.crypto.encrypt(dto.pan),
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
    const bp = await this.db.billingProfile.findUnique({ where: { businessId: business.id } });
    if (!bp) return null;
    // The owner sees their own values in full.
    return { ...bp, pan: this.crypto.decrypt(bp.pan), gstin: this.crypto.decrypt(bp.gstin) };
  }

  /**
   * Billing details for an admin. PAN/GSTIN are masked unless `reveal` is set,
   * and every reveal is written to the audit log — these are identity documents
   * belonging to someone else.
   */
  async getBillingProfileForAdmin(adminId: string, businessId: string, reveal = false) {
    const bp = await this.db.billingProfile.findUnique({ where: { businessId } });
    if (!bp) return null;

    const pan = this.crypto.decrypt(bp.pan);
    const gstin = this.crypto.decrypt(bp.gstin);

    if (!reveal) {
      return {
        ...bp,
        pan: CryptoService.mask(pan),
        gstin: CryptoService.mask(gstin),
        masked: true,
      };
    }

    await this.audit.log({
      tenantId: bp.tenantId,
      userId: adminId,
      action: 'BILLING_PII_REVEALED',
      resource: 'BILLING_PROFILE',
      resourceId: bp.id,
      metadata: { businessId, fields: ['pan', 'gstin'] },
    });

    return { ...bp, pan, gstin, masked: false };
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

  /** Invoice view for the paying business owner — includes billing profile, decrypted for its own owner. */
  async getPaymentInvoice(userId: string, tenantId: string, paymentId: string) {
    const payment = await this.db.payment.findFirst({
      where: { id: paymentId, tenantId, deletedAt: null },
      include: {
        business: { include: { billingProfile: true } },
        subscription: { select: { packageName: true, pricing: true, duration: true } },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.business.ownerId !== userId) throw new ForbiddenException('Not authorized');

    const meta: any = payment.invoiceMetadata || {};
    const split = splitTax(Number(payment.amount));
    const bp = payment.business.billingProfile;

    return {
      id: payment.id,
      amount: payment.amount,
      amountBase: meta.amountBase ?? split.base,
      amountTax: meta.amountTax ?? split.tax,
      taxPercent: meta.taxPercent ?? TAX_PERCENT,
      method: payment.method,
      status: payment.status,
      transactionRef: payment.transactionRef,
      rejectionReason: payment.rejectionReason,
      packageName: meta.packageName || payment.subscription?.packageName || null,
      cycle: meta.cycle || 'NEW',
      billingCycle: meta.billingCycle || null,
      // Itemised lines for cart purchases (bundle + add-on units); null for legacy single-plan payments.
      lines: Array.isArray(meta.cart?.lines)
        ? meta.cart.lines.map((l: any) => ({
            code: l.code,
            name: catalogueItem(l.code)?.name ?? l.code,
            quantity: l.quantity,
            unit: l.unit,
            amount: l.amount,
          }))
        : null,
      createdAt: payment.createdAt,
      verifiedAt: payment.verifiedAt,
      business: { name: payment.business.name, city: payment.business.city },
      billingProfile: bp
        ? {
            billingName: bp.billingName,
            hasGst: bp.hasGst,
            gstin: bp.hasGst ? this.crypto.decrypt(bp.gstin) : null,
            pan: this.crypto.decrypt(bp.pan),
            addressLine: bp.addressLine,
            city: bp.city,
            state: bp.state,
            pincode: bp.pincode,
            invoiceEmail: bp.invoiceEmail,
          }
        : null,
    };
  }

  async handleWebhookPlaceholder(body: any, signature: string) {
    // This serves as the Razorpay webhook verification placeholder
    // Real implementation would verify crypto signature
    return { status: 'received', message: 'Signature validation placeholder executed.' };
  }
}
