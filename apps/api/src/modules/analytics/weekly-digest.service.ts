import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { assertBusinessAccess, type AccessUser } from '../../common/utils/business-access';
import { addDaysKey, DAY_MS, istDateKey, istDayStart } from '../../common/utils/ist';
import { NotificationsService } from '../notifications/notifications.service';
import { EntitlementsService } from '../subscriptions/entitlements.service';

export type DigestNumbers = {
  views: number;
  actions: number;
  claims: number;
  verifiedBills: number;
  verifiedSpend: number;
};

const ZERO: DigestNumbers = { views: 0, actions: 0, claims: 0, verifiedBills: 0, verifiedSpend: 0 };
const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

function delta(cur: number, prev: number) {
  if (!prev) return cur ? ' (new)' : '';
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return ' (same as last week)';
  return ` (${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}%)`;
}

/** Plain-language summary an owner can read in a notification. Pure, so it's unit-tested. */
export function digestText(name: string, cur: DigestNumbers, prev: DigestNumbers) {
  const parts = [
    `${fmt(cur.views)} profile view${cur.views === 1 ? '' : 's'}${delta(cur.views, prev.views)}`,
    `${fmt(cur.actions)} call/direction/WhatsApp tap${cur.actions === 1 ? '' : 's'}${delta(cur.actions, prev.actions)}`,
  ];
  if (cur.claims || prev.claims)
    parts.push(
      `${fmt(cur.claims)} offer claim${cur.claims === 1 ? '' : 's'}${delta(cur.claims, prev.claims)}`,
    );
  if (cur.verifiedBills || prev.verifiedBills)
    parts.push(
      `₹${fmt(cur.verifiedSpend)} verified spend across ${fmt(cur.verifiedBills)} bill${cur.verifiedBills === 1 ? '' : 's'}`,
    );
  return { title: `${name}: your week on Whtzup.city`, body: `Last week: ${parts.join(', ')}.` };
}

/** Monday (IST) that starts the week containing `dayKey`. */
export function weekStartKey(dayKey: string) {
  const dow = new Date(`${dayKey}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDaysKey(dayKey, -((dow + 6) % 7));
}

/**
 * Monday-morning summary of last week for every approved business that had any activity,
 * sent as an in-app notification (and push, through the notification queue). Reads the
 * nightly rollups, so it's a handful of queries for the whole platform.
 *
 * Off unless WEEKLY_DIGEST=on: local dev shares the production database, and a dev box must
 * never notify real owners.
 */
@Injectable()
export class WeeklyDigestService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(WeeklyDigestService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
    private readonly entitlements: EntitlementsService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.WEEKLY_DIGEST !== 'on' || process.env.NODE_ENV === 'test') return;
    this.scheduleNext();
  }

  onModuleDestroy() {
    if (this.timer) clearTimeout(this.timer);
  }

  /** Next Monday 09:00 IST. */
  private scheduleNext() {
    const now = Date.now();
    const today = istDateKey(new Date(now));
    let monday = weekStartKey(today);
    let next = istDayStart(monday).getTime() + 9 * 3600 * 1000;
    if (next <= now) {
      monday = addDaysKey(monday, 7);
      next = istDayStart(monday).getTime() + 9 * 3600 * 1000;
    }
    // setTimeout caps at ~24.8 days; a week is fine.
    this.timer = setTimeout(() => {
      this.sendLastWeek()
        .catch((e) => this.logger.error(`Weekly digest failed: ${e?.message}`))
        .finally(() => this.scheduleNext());
    }, next - now);
    this.timer.unref?.();
  }

  private async totals(fromKey: string, toKey: string, businessId?: string) {
    const rows = await this.db.dailyBusinessStat.groupBy({
      by: ['businessId'],
      where: {
        date: { gte: new Date(`${fromKey}T00:00:00Z`), lt: new Date(`${toKey}T00:00:00Z`) },
        ...(businessId ? { businessId } : {}),
      },
      _sum: { views: true, actions: true, claims: true, verifiedBills: true, verifiedSpend: true },
    });
    return new Map<string, DigestNumbers>(
      rows.map((r) => [
        r.businessId,
        {
          views: r._sum.views ?? 0,
          actions: r._sum.actions ?? 0,
          claims: r._sum.claims ?? 0,
          verifiedBills: r._sum.verifiedBills ?? 0,
          verifiedSpend: Number(r._sum.verifiedSpend ?? 0),
        },
      ]),
    );
  }

  private window(todayKey = istDateKey(new Date())) {
    const thisMonday = weekStartKey(todayKey);
    const from = addDaysKey(thisMonday, -7);
    return { from, to: thisMonday, prevFrom: addDaysKey(from, -7) };
  }

  /** What an owner would receive for last week, without sending anything. */
  async preview(businessId: string, user: AccessUser) {
    const access = await assertBusinessAccess(this.db, businessId, user);
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'MASTER_ADMIN') {
      await this.entitlements.assertFeature(access.id, 'analytics');
    }
    const w = this.window();
    const [cur, prev, biz] = await Promise.all([
      this.totals(w.from, w.to, businessId),
      this.totals(w.prevFrom, w.from, businessId),
      this.db.business.findUnique({ where: { id: businessId }, select: { name: true } }),
    ]);
    const c = cur.get(businessId) ?? ZERO;
    const p = prev.get(businessId) ?? ZERO;
    return {
      from: w.from,
      to: addDaysKey(w.to, -1),
      current: c,
      previous: p,
      ...digestText(biz?.name ?? 'Your business', c, p),
    };
  }

  /** Sends last week's digest once per week across all API instances. */
  async sendLastWeek() {
    const w = this.window();
    const lock = `analytics:digest:${w.from}`;
    if ((await this.redis.incr(lock)) !== 1) return { skipped: true, week: w.from };
    await this.redis.expire(lock, (8 * DAY_MS) / 1000);

    const [cur, prev] = await Promise.all([
      this.totals(w.from, w.to),
      this.totals(w.prevFrom, w.from),
    ]);
    const ids = [...new Set([...cur.keys(), ...prev.keys()])];
    if (!ids.length) return { sent: 0, week: w.from };

    const businesses = await this.db.business.findMany({
      where: { id: { in: ids }, status: 'APPROVED', deletedAt: null },
      select: { id: true, name: true, ownerId: true, tenantId: true },
    });
    let sent = 0;
    for (const b of businesses) {
      const c = cur.get(b.id) ?? ZERO;
      const p = prev.get(b.id) ?? ZERO;
      if (!c.views && !c.actions && !c.claims && !c.verifiedBills) continue; // nothing new to say
      // The digest is part of the analytics plan.
      if (!(await this.entitlements.forBusiness(b.id)).analytics) continue;
      const { title, body } = digestText(b.name, c, p);
      try {
        await this.notifications.send({
          tenantId: b.tenantId,
          userId: b.ownerId,
          title,
          body,
          type: 'IN_APP',
          channel: 'BUSINESS',
          metadata: { kind: 'WEEKLY_DIGEST', week: w.from, href: '/dashboard/analytics?range=7d' },
        });
        sent++;
      } catch (e: any) {
        this.logger.warn(`Digest for ${b.id} failed: ${e?.message}`);
      }
    }
    this.logger.log(`Weekly digest ${w.from}: sent ${sent} of ${businesses.length}`);
    return { sent, week: w.from };
  }
}
