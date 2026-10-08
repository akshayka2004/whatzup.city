import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { addDaysKey, DAY_MS, istDateKey, istDayStart } from '../../common/utils/ist';
import { ACTION_GROUPS, eventsFor } from './event-taxonomy';

/** Row written for every computed day so "computed, zero activity" ≠ "not computed yet". */
export const ROLLUP_SENTINEL = '00000000-0000-0000-0000-000000000000';

const VID = Prisma.raw(`coalesce(metadata->>'visitorId', session_id, ip_address, id::text)`);
const HUMAN = Prisma.raw(`coalesce((metadata->>'isBot')::boolean, false) = false`);
const inList = (names: string[]) => Prisma.join(names);

/**
 * Nightly per-business daily rollups (IST days). Reports read them for completed days and
 * fall back to raw events for anything not yet computed, so numbers never depend on the job.
 */
@Injectable()
export class AnalyticsRollupService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsRollupService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.ANALYTICS_ROLLUPS === 'off' || process.env.NODE_ENV === 'test') return;
    this.scheduleNext();
  }

  onModuleDestroy() {
    if (this.timer) clearTimeout(this.timer);
  }

  /** Next 00:30 IST (19:00 UTC). Re-arms itself after each run. */
  private scheduleNext() {
    const now = Date.now();
    const todayKey = istDateKey(new Date(now));
    let next = istDayStart(todayKey).getTime() + 30 * 60 * 1000;
    if (next <= now) next += DAY_MS;
    this.timer = setTimeout(() => {
      this.runNightly()
        .catch((e) => this.logger.error(`Nightly rollup failed: ${e?.message}`))
        .finally(() => this.scheduleNext());
    }, next - now);
    this.timer.unref?.();
  }

  /** Yesterday and the day before (late-arriving events), once per day across instances. */
  async runNightly() {
    const today = istDateKey(new Date());
    for (const day of [addDaysKey(today, -1), addDaysKey(today, -2)]) {
      const lock = `analytics:rollup:lock:${day}:${today}`;
      if ((await this.redis.incr(lock)) !== 1) continue;
      await this.redis.expire(lock, 6 * 3600);
      await this.computeDay(day);
    }
  }

  /** Recompute one IST day for every business with activity, plus the sentinel row. */
  async computeDay(dayKey: string) {
    const start = istDayStart(dayKey);
    const end = new Date(start.getTime() + DAY_MS);
    const views = inList(eventsFor('profileView'));
    const acts = inList(eventsFor(...ACTION_GROUPS));
    const t0 = Date.now();

    const written = await this.db.$executeRaw(Prisma.sql`
      WITH ev AS (
        SELECT business_id,
          count(*) FILTER (WHERE event IN (${views})) AS views,
          count(DISTINCT ${VID}) FILTER (WHERE event IN (${views})) AS visitors,
          count(*) FILTER (WHERE event IN (${acts})) AS actions,
          count(*) FILTER (WHERE event IN (${inList(eventsFor('call'))})) AS calls,
          count(*) FILTER (WHERE event IN (${inList(eventsFor('directions'))})) AS directions,
          count(*) FILTER (WHERE event IN (${inList(eventsFor('whatsapp'))})) AS whatsapp,
          count(*) FILTER (WHERE event IN (${inList(eventsFor('website'))})) AS website,
          count(*) FILTER (WHERE event IN (${inList(eventsFor('share'))})) AS shares,
          count(*) FILTER (WHERE event IN (${inList(eventsFor('save'))})) AS saves,
          count(*) FILTER (WHERE event IN (${inList(eventsFor('impression'))})) AS impressions,
          count(*) FILTER (WHERE event IN (${inList(eventsFor('cardClick'))})) AS card_clicks
        FROM analytics_events
        WHERE business_id IS NOT NULL AND created_at >= ${start} AND created_at < ${end}
          AND deleted_at IS NULL AND ${HUMAN}
        GROUP BY business_id
      ),
      cl AS (
        SELECT o.business_id, count(*) AS claims
        FROM offer_redemptions r JOIN offers o ON o.id = r.offer_id
        WHERE r.deleted_at IS NULL AND r.created_at >= ${start} AND r.created_at < ${end}
        GROUP BY o.business_id
      ),
      bi AS (
        SELECT business_id, count(*) AS verified_bills, coalesce(sum(amount), 0) AS verified_spend
        FROM bills
        WHERE deleted_at IS NULL AND status = 'VERIFIED' AND verified_at >= ${start} AND verified_at < ${end}
        GROUP BY business_id
      ),
      allb AS (
        SELECT business_id FROM ev UNION SELECT business_id FROM cl UNION SELECT business_id FROM bi
        UNION SELECT ${ROLLUP_SENTINEL}::uuid
      )
      INSERT INTO daily_business_stats (id, business_id, date, views, visitors, actions, calls, directions, whatsapp,
        website, shares, saves, impressions, card_clicks, claims, verified_bills, verified_spend, computed_at)
      SELECT gen_random_uuid(), a.business_id, ${dayKey}::date,
        coalesce(ev.views, 0), coalesce(ev.visitors, 0), coalesce(ev.actions, 0), coalesce(ev.calls, 0),
        coalesce(ev.directions, 0), coalesce(ev.whatsapp, 0), coalesce(ev.website, 0), coalesce(ev.shares, 0),
        coalesce(ev.saves, 0), coalesce(ev.impressions, 0), coalesce(ev.card_clicks, 0), coalesce(cl.claims, 0),
        coalesce(bi.verified_bills, 0), coalesce(bi.verified_spend, 0), now()
      FROM allb a
      LEFT JOIN ev ON ev.business_id = a.business_id
      LEFT JOIN cl ON cl.business_id = a.business_id
      LEFT JOIN bi ON bi.business_id = a.business_id
      ON CONFLICT (business_id, date) DO UPDATE SET
        views = EXCLUDED.views, visitors = EXCLUDED.visitors, actions = EXCLUDED.actions, calls = EXCLUDED.calls,
        directions = EXCLUDED.directions, whatsapp = EXCLUDED.whatsapp, website = EXCLUDED.website,
        shares = EXCLUDED.shares, saves = EXCLUDED.saves, impressions = EXCLUDED.impressions,
        card_clicks = EXCLUDED.card_clicks, claims = EXCLUDED.claims, verified_bills = EXCLUDED.verified_bills,
        verified_spend = EXCLUDED.verified_spend, computed_at = now()`);

    this.logger.log(`Rollup ${dayKey}: ${written} rows in ${Date.now() - t0} ms`);
    return { day: dayKey, rows: written };
  }

  /** Recompute the last `days` completed IST days, oldest first. */
  async backfill(days: number) {
    const n = Math.max(1, Math.min(400, Math.floor(days)));
    const today = istDateKey(new Date());
    const out: { day: string; rows: number }[] = [];
    for (let i = n; i >= 1; i--) out.push(await this.computeDay(addDaysKey(today, -i)));
    return { days: out.length, rows: out.reduce((s, d) => s + d.rows, 0) };
  }

  /** Day keys in [from, to] that have been computed. */
  async computedDays(from: string, to: string): Promise<Set<string>> {
    const rows = await this.db.dailyBusinessStat.findMany({
      where: { businessId: ROLLUP_SENTINEL, date: { gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T00:00:00Z`) } },
      select: { date: true },
    });
    return new Set(rows.map((r) => r.date.toISOString().slice(0, 10)));
  }
}
