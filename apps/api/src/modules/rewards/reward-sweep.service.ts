// ============================================================
// Hourly housekeeping for rewards: tell customers a claimed code is about to expire, and nudge owners
// who have bills waiting for more than a day (slow approval is the main reason progress stalls).
// Each notice is deduped in the database, so a second server or a restart does not repeat it.
// ============================================================

import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RewardProgressService } from './reward-progress.service';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const IST_OFFSET_MS = 5.5 * HOUR_MS;

@Injectable()
export class RewardSweepService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RewardSweepService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly db: DatabaseService,
    private readonly progress: RewardProgressService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test' || process.env.REWARD_SWEEP === 'off') return;
    this.timer = setInterval(() => void this.sweep(), HOUR_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async sweep(now = Date.now()) {
    await this.remindExpiring(now).catch((e) => this.logger.warn(`expiring: ${e?.message ?? e}`));
    // The owner digest goes out once a day, in the 9 am hour India time.
    if (new Date(now + IST_OFFSET_MS).getUTCHours() === 9) {
      await this.remindOwners(now).catch((e) => this.logger.warn(`owners: ${e?.message ?? e}`));
    }
  }

  /** Claimed, unused codes that run out within 3 days: one notice each. */
  async remindExpiring(now: number): Promise<number> {
    // tenant-scope-ok: platform-wide housekeeping over claims about to expire
    const claims = await this.db.voucherClaim.findMany({
      where: {
        status: 'UNLOCKED',
        deletedAt: null,
        expiresAt: { gt: new Date(now), lte: new Date(now + 3 * DAY_MS) },
      },
      include: {
        voucher: { select: { title: true } },
        business: { select: { name: true } },
        user: { select: { tenantId: true } },
      },
      take: 500,
    });
    let sent = 0;
    for (const c of claims) {
      const fresh = await this.progress.recordEvent({
        tenantId: c.tenantId,
        userId: c.userId,
        voucherId: c.voucherId,
        businessId: c.businessId,
        kind: 'EXPIRING',
        cycleKey: c.id,
      });
      if (!fresh) continue;
      const left = Math.max(1, Math.ceil((c.expiresAt!.getTime() - now) / DAY_MS));
      await this.notifications
        ?.send({
          tenantId: c.user.tenantId,
          userId: c.userId,
          title: 'Your reward expires soon',
          body: `"${c.voucher.title}" at ${c.business.name} ends in ${left} day${left === 1 ? '' : 's'}. Show your code before then.`,
          type: 'IN_APP',
          channel: 'BUSINESS',
          metadata: { kind: 'REWARD_EXPIRING', claimId: c.id },
        })
        .catch(() => undefined);
      sent++;
    }
    return sent;
  }

  /** Owners with bills waiting more than 24 hours get one nudge a day. */
  async remindOwners(now: number): Promise<number> {
    // tenant-scope-ok: platform-wide count of stale pending bills per business
    const stale = await this.db.billVerification.groupBy({
      by: ['businessId'],
      where: {
        status: 'PENDING',
        businessId: { not: null },
        createdAt: { lt: new Date(now - DAY_MS) },
      },
      _count: { _all: true },
      orderBy: { businessId: 'asc' },
      take: 1000,
    });
    if (!stale.length) return 0;
    // tenant-scope-ok: owner lookup by business id
    const businesses = await this.db.business.findMany({
      where: { id: { in: stale.map((s) => s.businessId!) }, deletedAt: null },
      select: { id: true, name: true, ownerId: true, tenantId: true },
    });
    const byId = new Map(businesses.map((b) => [b.id, b]));
    let sent = 0;
    for (const s of stale) {
      const b = byId.get(s.businessId!);
      if (!b) continue;
      // tenant-scope-ok: dedupe check on the owner's own notifications
      const already = await this.db.notification.findFirst({
        where: {
          userId: b.ownerId,
          title: 'Bills are waiting for you',
          createdAt: { gte: new Date(now - 20 * HOUR_MS) },
        },
        select: { id: true },
      });
      if (already) continue;
      const n = s._count._all;
      await this.notifications
        ?.send({
          tenantId: b.tenantId,
          userId: b.ownerId,
          title: 'Bills are waiting for you',
          body: `${n} bill${n === 1 ? '' : 's'} at ${b.name} ${n === 1 ? 'has' : 'have'} waited over a day. Customers earn rewards only after you approve.`,
          type: 'IN_APP',
          channel: 'BUSINESS',
          metadata: { kind: 'BILLS_WAITING', businessId: b.id, count: n },
        })
        .catch(() => undefined);
      sent++;
    }
    return sent;
  }
}
