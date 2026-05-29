import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DatabaseService } from '../../common/database/database.service';

const TRIAL_DAYS = 15;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class TrialsService {
  private readonly logger = new Logger(TrialsService.name);

  constructor(
    private readonly db: DatabaseService,
    @InjectQueue('trial-queue') private readonly trialQueue: Queue,
  ) {}

  // ── Called from VerificationService.approveRequest() ─────────────────

  async startTrial(tenantId: string, businessId: string, ownerId: string): Promise<void> {
    const business = await this.db.business.findFirst({
      where: { id: businessId, tenantId },
    });

    if (!business) {
      this.logger.warn(`startTrial: business ${businessId} not found`);
      return;
    }

    // Idempotent — don't restart if already ACTIVE
    if (business.trialStatus === 'ACTIVE' || business.trialStatus === 'CONVERTED') {
      this.logger.log(`startTrial: skipped — trial already ${business.trialStatus}`);
      return;
    }

    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_DAYS * MS_PER_DAY);

    await this.db.business.update({
      where: { id: businessId },
      data: {
        trialStatus: 'ACTIVE',
        trialStartDate: now,
        trialEndDate: trialEnd,
      },
    });

    this.logger.log(`Trial started for business ${businessId}, ends ${trialEnd.toISOString()}`);

    // Schedule trial expiry notifications
    // Day 10 → "Trial ends in 5 days"
    // Day 13 → "Trial ends in 2 days"
    // Day 15 → "Trial expires today"
    // Day 16 → "Subscription required"
    const notifications = [
      { dayOffset: 9,  title: 'Trial ends in 5 days',  body: 'Your 15-day free trial ends in 5 days. Select a subscription plan to keep full access.' },
      { dayOffset: 12, title: 'Trial ends in 2 days',  body: 'Only 2 days left on your free trial. Choose a plan to avoid losing access.' },
      { dayOffset: 14, title: 'Trial expires today',   body: 'Your free trial expires today. Select a subscription plan now to continue.' },
      { dayOffset: 15, title: 'Subscription required', body: 'Your free trial has ended. Please subscribe to continue using the platform.' },
    ];

    for (const n of notifications) {
      const delayMs = n.dayOffset * MS_PER_DAY;
      await this.trialQueue.add(
        'send-trial-notification',
        { tenantId, businessId, ownerId, title: n.title, body: n.body },
        { delay: delayMs, removeOnComplete: true, removeOnFail: 50 },
      );
    }

    this.logger.log(`Scheduled ${notifications.length} trial notifications for business ${businessId}`);
  }

  // ── Business: get own trial status ────────────────────────────────────

  async getMyTrial(tenantId: string, businessId: string) {
    const business = await this.db.business.findFirst({
      where: { id: businessId, tenantId },
      select: {
        trialStatus: true,
        trialStartDate: true,
        trialEndDate: true,
        hasIntroOffer: true,
        introOfferClaimedAt: true,
        introOfferRedeemed: true,
        introOfferDiscountPct: true,
      },
    });

    if (!business) throw new NotFoundException('Business not found');

    // Sync expired status at read time
    if (
      business.trialStatus === 'ACTIVE' &&
      business.trialEndDate &&
      new Date() > business.trialEndDate
    ) {
      await this.db.business.update({
        where: { id: businessId },
        data: { trialStatus: 'EXPIRED' },
      });
      business.trialStatus = 'EXPIRED' as any;
    }

    const now = new Date();
    const daysRemaining =
      business.trialStatus === 'ACTIVE' && business.trialEndDate
        ? Math.max(0, Math.ceil((business.trialEndDate.getTime() - now.getTime()) / MS_PER_DAY))
        : 0;

    return {
      trialStatus: business.trialStatus,
      trialStartDate: business.trialStartDate,
      trialEndDate: business.trialEndDate,
      daysRemaining,
      hasIntroOffer: business.hasIntroOffer,
      introOfferClaimedAt: business.introOfferClaimedAt,
      introOfferRedeemed: business.introOfferRedeemed,
      introOfferDiscountPct: business.introOfferDiscountPct,
    };
  }

  // ── Business: claim introductory offer ───────────────────────────────

  async claimIntroOffer(tenantId: string, businessId: string) {
    const business = await this.db.business.findFirst({
      where: { id: businessId, tenantId },
      select: { hasIntroOffer: true, introOfferRedeemed: true },
    });

    if (!business) throw new NotFoundException('Business not found');
    if (business.hasIntroOffer) throw new BadRequestException('Introductory offer already claimed');

    const updated = await this.db.business.update({
      where: { id: businessId },
      data: {
        hasIntroOffer: true,
        introOfferClaimedAt: new Date(),
        introOfferDiscountPct: 20,
      },
      select: {
        hasIntroOffer: true,
        introOfferClaimedAt: true,
        introOfferDiscountPct: true,
      },
    });

    this.logger.log(`Intro offer claimed for business ${businessId}`);
    return updated;
  }

  // ── Super admin: trial stats ──────────────────────────────────────────

  async getTrialStats(tenantId?: string) {
    const baseWhere = tenantId ? { tenantId } : {};

    const [onTrial, expiringIn7Days, expired, introClaimed, introRedeemed] = await Promise.all([
      this.db.business.count({ where: { ...baseWhere, trialStatus: 'ACTIVE' } }),
      this.db.business.count({
        where: {
          ...baseWhere,
          trialStatus: 'ACTIVE',
          trialEndDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * MS_PER_DAY),
          },
        },
      }),
      this.db.business.count({ where: { ...baseWhere, trialStatus: 'EXPIRED' } }),
      this.db.business.count({ where: { ...baseWhere, hasIntroOffer: true } }),
      this.db.business.count({ where: { ...baseWhere, introOfferRedeemed: true } }),
    ]);

    return { onTrial, expiringIn7Days, expired, introClaimed, introRedeemed };
  }
}
