import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { paymentsEnabled } from '../../common/utils/payments-flag';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { addDaysKey, istDateKey, istDayStart } from '../../common/utils/ist';
import { mapWithConcurrency } from '../../common/utils/concurrency';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { EntitlementsService } from './entitlements.service';

/**
 * When a plan or add-on lapses the business drops to Free and keeps its listing, but anything over
 * the new limit has to stop being live. This pauses the newest offers/vouchers first (the owner can
 * resume which ones to keep) and tells the owner once.
 *
 * Grandfathered legacy plans are never auto-paused: their limits were not enforced when sold.
 *
 * Off unless PLAN_AUTOPAUSE=on: local dev shares the production database, so only the VPS runs it.
 */
@Injectable()
export class PlanEnforcementService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(PlanEnforcementService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly entitlements: EntitlementsService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  onApplicationBootstrap() {
    // With payments dormant the single plan only limits new offers; nothing live is paused.
    if (!paymentsEnabled()) return;
    if (process.env.PLAN_AUTOPAUSE !== 'on' || process.env.NODE_ENV === 'test') return;
    this.scheduleNext();
  }

  onModuleDestroy() {
    if (this.timer) clearTimeout(this.timer);
  }

  /** Next 03:30 IST. */
  private scheduleNext() {
    const now = Date.now();
    let day = istDateKey(new Date(now));
    let next = istDayStart(day).getTime() + 3.5 * 3600 * 1000;
    if (next <= now) {
      day = addDaysKey(day, 1);
      next = istDayStart(day).getTime() + 3.5 * 3600 * 1000;
    }
    this.timer = setTimeout(() => {
      this.runAll()
        .catch((e) => this.logger.error(`Plan enforcement failed: ${e?.message}`))
        .finally(() => this.scheduleNext());
    }, next - now);
    this.timer.unref?.();
  }

  /** Pause whatever exceeds this business's entitlement. Returns how many of each were paused. */
  async pauseOverLimit(businessId: string) {
    const ent = await this.entitlements.forBusiness(businessId);
    const paused = { offers: 0, vouchers: 0 };
    if (ent.source === 'LEGACY') return paused;

    const now = new Date();
    const where = { businessId, status: 'ACTIVE' as const, deletedAt: null, endDate: { gte: now } };

    // tenant-scope-ok: per business id
    const offers = await this.db.offer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (offers.length > ent.offers) {
      const ids = offers.slice(0, offers.length - ent.offers).map((o) => o.id);
      await this.db.offer.updateMany({ where: { id: { in: ids } }, data: { status: 'PAUSED' } });
      paused.offers = ids.length;
    }

    // tenant-scope-ok: per business id
    const vouchers = await this.db.voucher.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (vouchers.length > ent.vouchers) {
      const ids = vouchers.slice(0, vouchers.length - ent.vouchers).map((v) => v.id);
      await this.db.voucher.updateMany({ where: { id: { in: ids } }, data: { status: 'PAUSED' } });
      paused.vouchers = ids.length;
    }

    if (paused.offers || paused.vouchers) {
      const biz = await this.db.business.findUnique({
        where: { id: businessId },
        select: { ownerId: true, tenantId: true, name: true },
      });
      if (biz?.ownerId) {
        const parts = [
          paused.offers ? `${paused.offers} offer${paused.offers === 1 ? '' : 's'}` : '',
          paused.vouchers ? `${paused.vouchers} voucher${paused.vouchers === 1 ? '' : 's'}` : '',
        ].filter(Boolean);
        try {
          await this.notifications.send({
            tenantId: biz.tenantId,
            userId: biz.ownerId,
            title: 'Some offers were paused',
            body: `${parts.join(' and ')} on ${biz.name} went over your current plan and were paused. Renew or add more to bring them back.`,
            type: 'IN_APP',
            channel: 'BUSINESS',
            metadata: { kind: 'PLAN_PAUSED', href: '/dashboard/subscriptions', businessId },
          });
        } catch (e: any) {
          this.logger.warn(`Pause notice for ${businessId} failed: ${e?.message}`);
        }
        await this.audit.log({
          tenantId: biz.tenantId,
          userId: biz.ownerId,
          action: 'PLAN_AUTO_PAUSE',
          resource: 'BUSINESS',
          resourceId: businessId,
          metadata: paused,
        });
      }
    }
    return paused;
  }

  async runAll() {
    const day = istDateKey(new Date());
    const lock = `plan:autopause:${day}`;
    if ((await this.redis.incr(lock)) !== 1) return { skipped: true };
    await this.redis.expire(lock, 36 * 3600);

    const now = new Date();
    const live = { status: 'ACTIVE' as const, deletedAt: null, endDate: { gte: now } };
    // Free allows 1 live offer and 0 vouchers, so those are the only businesses that can be over.
    // tenant-scope-ok: platform-wide maintenance job
    const [offerGroups, voucherGroups] = await Promise.all([
      this.db.offer.groupBy({ by: ['businessId'], where: live, _count: { _all: true } }),
      this.db.voucher.groupBy({ by: ['businessId'], where: live, _count: { _all: true } }),
    ]);
    const candidates = new Set<string>();
    offerGroups.forEach((g) => g._count._all > 1 && candidates.add(g.businessId));
    voucherGroups.forEach((g) => g._count._all > 0 && candidates.add(g.businessId));

    let pausedBusinesses = 0;
    await mapWithConcurrency([...candidates], 5, async (id) => {
      try {
        const p = await this.pauseOverLimit(id);
        if (p.offers || p.vouchers) pausedBusinesses++;
      } catch (e: any) {
        this.logger.warn(`Auto-pause for ${id} failed: ${e?.message}`);
      }
    });
    this.logger.log(
      `Plan enforcement: checked ${candidates.size}, paused extras for ${pausedBusinesses}`,
    );
    return { checked: candidates.size, paused: pausedBusinesses };
  }
}
