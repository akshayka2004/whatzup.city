// ============================================================
// Reward progress. How far a customer is on each reward, and the notices that follow a verified bill:
// "almost there" at 80%, "you earned it" when a claim opens. Every notice is written once per
// (customer, reward, kind, claim number) in reward_events, which also feeds the business funnel.
// ============================================================

import { Injectable, Logger, Optional } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RewardAudienceService } from './reward-audience.service';
import {
  CycleState,
  LIMITS,
  cycleKey,
  cycleState,
  normalizeAudience,
  windowStart,
} from './reward-rules';

export type VoucherLike = {
  id: string;
  tenantId: string;
  businessId: string;
  title: string;
  thresholdAmount: any;
  spendWindow: string;
  repeatable: boolean;
  perCustomerLimit: number | null;
  startDate: Date;
  endDate: Date;
  audience: unknown;
};

export type RewardState = CycleState & {
  spend: number;
  threshold: number;
  windowFrom: Date | null;
  /** What the next claim would be called (see cycleKey). */
  nextCycleKey: string;
};

export type RewardEventKind = 'NEAR' | 'READY' | 'CLAIMED' | 'REDEEMED' | 'EXPIRING';

@Injectable()
export class RewardProgressService {
  private readonly logger = new Logger(RewardProgressService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly audience: RewardAudienceService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  /** Verified spend at one business from `since` (null = ever). Voided or removed purchases are not counted. */
  async spendSince(userId: string, businessId: string, since: Date | null): Promise<number> {
    // tenant-scope-ok: a customer's purchases at one business, read across tenants by design
    const agg = await this.db.verifiedPurchase.aggregate({
      where: {
        userId,
        businessId,
        deletedAt: null,
        ...(since ? { purchaseDate: { gte: since } } : {}),
      },
      _sum: { amount: true },
    });
    return Number(agg._sum.amount ?? 0);
  }

  async claimsInWindow(userId: string, voucherId: string, since: Date | null): Promise<number> {
    // tenant-scope-ok: a customer's own claims of one voucher
    return this.db.voucherClaim.count({
      where: {
        userId,
        voucherId,
        deletedAt: null,
        ...(since ? { unlockedAt: { gte: since } } : {}),
      },
    });
  }

  async stateFor(v: VoucherLike, userId: string, now = Date.now()): Promise<RewardState> {
    const from = windowStart(v, now);
    const [spend, claimed] = await Promise.all([
      this.spendSince(userId, v.businessId, from),
      this.claimsInWindow(userId, v.id, from),
    ]);
    const threshold = Number(v.thresholdAmount);
    const state = cycleState({
      threshold,
      repeatable: v.repeatable,
      cap: v.perCustomerLimit,
      spend,
      claimedInWindow: claimed,
    });
    return {
      ...state,
      spend,
      threshold,
      windowFrom: from,
      nextCycleKey: cycleKey(v, now, claimed),
    };
  }

  /** Writes one event; false when the same one was already written (so the caller skips the notice). */
  async recordEvent(e: {
    tenantId: string;
    userId: string;
    voucherId: string;
    businessId: string;
    kind: RewardEventKind;
    cycleKey?: string;
    amount?: number | null;
  }): Promise<boolean> {
    try {
      await this.db.rewardEvent.create({
        data: {
          tenantId: e.tenantId,
          userId: e.userId,
          voucherId: e.voucherId,
          businessId: e.businessId,
          kind: e.kind,
          cycleKey: e.cycleKey ?? '',
          amount: e.amount ?? null,
        },
      });
      return true;
    } catch (err: any) {
      if (err?.code === 'P2002') return false;
      this.logger.warn(`reward event failed: ${err?.message ?? err}`);
      return false;
    }
  }

  private async notify(
    tenantId: string,
    userId: string,
    title: string,
    body: string,
    metadata: Record<string, unknown>,
  ) {
    await this.notifications
      ?.send({ tenantId, userId, title, body, type: 'IN_APP', channel: 'BUSINESS', metadata })
      .catch(() => undefined);
  }

  /**
   * Called after a bill is verified (photo or counter). Looks at every live reward of that business the
   * customer is in the audience of, and sends "almost there" or "you earned it" once each.
   * Never throws: a notice failing must not undo a bill approval.
   */
  async onSpend(userId: string, businessId: string, now = Date.now()): Promise<void> {
    try {
      // tenant-scope-ok: rewards are looked up by the globally unique business id
      const vouchers = await this.db.voucher.findMany({
        where: {
          businessId,
          deletedAt: null,
          status: 'ACTIVE',
          startDate: { lte: new Date(now) },
          endDate: { gte: new Date(now) },
        },
        take: 20,
      });
      if (!vouchers.length) return;
      const [user, business] = await Promise.all([
        // tenant-scope-ok: the customer's own row
        this.db.user.findFirst({ where: { id: userId }, select: { tenantId: true } }),
        // tenant-scope-ok: name only
        this.db.business.findFirst({ where: { id: businessId }, select: { name: true } }),
      ]);
      if (!user) return;
      for (const v of vouchers) {
        if (!(await this.audience.matches(v, userId, now))) continue;
        const st = await this.stateFor(v as any, userId, now);
        if (st.done && st.claimable === 0) continue;
        const where = business?.name ?? 'the business';
        if (st.claimable > 0) {
          const fresh = await this.recordEvent({
            tenantId: v.tenantId,
            userId,
            voucherId: v.id,
            businessId,
            kind: 'READY',
            cycleKey: st.nextCycleKey,
            amount: st.spend,
          });
          if (fresh) {
            await this.notify(
              user.tenantId,
              userId,
              'Reward ready 🎉',
              `You earned "${v.title}" at ${where}. Open Rewards to claim it.`,
              { kind: 'REWARD_READY', voucherId: v.id, businessId },
            );
          }
        } else if (st.progress >= LIMITS.nearAt && st.progress > 0) {
          const fresh = await this.recordEvent({
            tenantId: v.tenantId,
            userId,
            voucherId: v.id,
            businessId,
            kind: 'NEAR',
            cycleKey: st.nextCycleKey,
            amount: st.spend,
          });
          if (fresh) {
            await this.notify(
              user.tenantId,
              userId,
              'Almost there',
              `Spend ₹${st.remaining.toLocaleString('en-IN')} more at ${where} to earn "${v.title}".`,
              { kind: 'REWARD_NEAR', voucherId: v.id, businessId },
            );
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`onSpend failed: ${err?.message ?? err}`);
    }
  }

  /** Re-exported so callers do not need a second import for the audience clean-up. */
  cleanAudience(raw: unknown) {
    return normalizeAudience(raw);
  }
}
