import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../audit/audit.service';
import { CreatePaymentDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
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
        invoiceMetadata: {
          generatedBy: userId,
          billingEmail: business.email,
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
    const payment = await this.db.payment.findFirst({
      where: { id: paymentId, tenantId },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    const updated = await this.db.payment.update({
      where: { id: paymentId },
      data: { status: 'SUCCESS' },
    });

    // If subscription is linked, activate the subscription
    if (payment.subscriptionId) {
      await this.db.subscription.update({
        where: { id: payment.subscriptionId },
        data: { status: 'ACTIVE' },
      });
    }

    await this.audit.log({
      tenantId,
      userId: adminId,
      action: 'PAYMENT_VERIFIED',
      resource: 'PAYMENT',
      resourceId: paymentId,
      metadata: { originalPayment: payment },
    });

    return updated;
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
