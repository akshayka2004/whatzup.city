import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class OnboardingAnalyticsService {
  constructor(private readonly db: DatabaseService) {}

  async getFunnelStats(tenantId: string) {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    // ── CUSTOMER FUNNEL ─────────────────────────────────────
    const customerStarted = await this.db.onboardingEvent.count({
      where: { tenantId, entityType: 'CUSTOMER', event: 'ONBOARDING_STARTED' },
    });

    const customerVerified = await this.db.onboardingEvent.count({
      where: { tenantId, entityType: 'CUSTOMER', event: 'EMAIL_VERIFIED' },
    });

    const customerCompleted = await this.db.onboardingEvent.count({
      where: { tenantId, entityType: 'CUSTOMER', event: 'ONBOARDING_COMPLETED' },
    });

    // ── BUSINESS FUNNEL ─────────────────────────────────────
    const businessStarted = await this.db.onboardingEvent.count({
      where: { tenantId, entityType: 'BUSINESS', event: 'BUSINESS_ONBOARDING_STARTED' },
    });

    const businessSubmitted = await this.db.onboardingEvent.count({
      where: { tenantId, entityType: 'BUSINESS', event: 'BUSINESS_SUBMITTED_VERIFICATION' },
    });

    const businessApproved = await this.db.onboardingEvent.count({
      where: { tenantId, entityType: 'BUSINESS', event: 'ONBOARDING_APPROVED' },
    });

    const businessRejected = await this.db.onboardingEvent.count({
      where: { tenantId, entityType: 'BUSINESS', event: 'ONBOARDING_REJECTED' },
    });

    // Abandonment Definition: Onboarding progress draft unchanged for more than 7 days
    const customerAbandoned = await this.db.onboardingProgress.count({
      where: {
        tenantId,
        entityType: 'CUSTOMER',
        status: 'PENDING', // draft state prior to completion
        updatedAt: { lte: sevenDaysAgo },
      },
    });

    const businessAbandoned = await this.db.onboardingProgress.count({
      where: {
        tenantId,
        entityType: 'BUSINESS',
        status: 'DRAFT',
        updatedAt: { lte: sevenDaysAgo },
      },
    });

    // Subscriptions Purchases Count
    const packagePurchases = await this.db.subscription.groupBy({
      by: ['packageName'],
      where: { tenantId, status: 'ACTIVE' },
      _count: { id: true },
      _sum: { pricing: true },
    });

    // Compute conversion rates
    const customerConversion =
      customerStarted > 0 ? (customerCompleted / customerStarted) * 100 : 0;
    const businessConversion = businessStarted > 0 ? (businessApproved / businessStarted) * 100 : 0;

    return {
      customerFunnel: {
        started: customerStarted,
        emailVerified: customerVerified,
        completed: customerCompleted,
        abandoned: customerAbandoned,
        conversionRate: parseFloat(customerConversion.toFixed(2)),
      },
      businessFunnel: {
        started: businessStarted,
        submitted: businessSubmitted,
        approved: businessApproved,
        rejected: businessRejected,
        abandoned: businessAbandoned,
        conversionRate: parseFloat(businessConversion.toFixed(2)),
      },
      packagePurchases: packagePurchases.map((p) => ({
        packageName: p.packageName,
        count: p._count.id,
        revenue: p._sum.pricing ? parseFloat(p._sum.pricing.toString()) : 0,
      })),
    };
  }
}
