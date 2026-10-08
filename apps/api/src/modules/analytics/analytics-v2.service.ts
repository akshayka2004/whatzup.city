import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { assertBusinessAccess, type AccessUser } from '../../common/utils/business-access';
import { bucketKey, dayKeys, istRange, pctChange, previousRange, type IstRange } from '../../common/utils/ist';
import { ACTION_GROUPS, EVENT_GROUPS, eventsFor, groupOf, type EventGroup } from './event-taxonomy';

export type Granularity = 'day' | 'week' | 'month';
export type RangeQuery = { from?: string; to?: string; days?: number; granularity?: Granularity };

type Metric = { value: number; previous: number; change: number | null };

const n = (v: unknown) => (typeof v === 'bigint' ? Number(v) : v == null ? 0 : Number(v));
const metric = (value: number, previous: number): Metric => ({ value, previous, change: pctChange(value, previous) });
const round1 = (v: number) => Math.round(v * 10) / 10;

/** IST calendar day of a UTC timestamp column, as 'YYYY-MM-DD'. */
const istDay = (col: string) =>
  Prisma.raw(`to_char((${col} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')`);

/**
 * One visitor = first-party visitor id, else browser session, else daily IP hash, else the row
 * itself (old rows recorded before visitor ids existed count individually).
 */
const VID = Prisma.raw(`coalesce(metadata->>'visitorId', session_id, ip_address, id::text)`);
const HUMAN = Prisma.raw(`coalesce((metadata->>'isBot')::boolean, false) = false`);

/**
 * Analytics v2: precise, IST-bucketed, bot-filtered, visitor-deduplicated reports with
 * period-over-period comparison. Computed from source tables on read (cached briefly), so
 * every number reconciles with the raw rows.
 */
@Injectable()
export class AnalyticsV2Service {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  private range(q: RangeQuery) {
    const r = istRange({ from: q.from, to: q.to, days: q.days ? Number(q.days) : 30, maxDays: 400 });
    const g: Granularity = q.granularity && ['day', 'week', 'month'].includes(q.granularity) ? q.granularity : r.days > 120 ? 'week' : 'day';
    return { r, prev: previousRange(r), g };
  }

  private async cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const hit = await this.redis.get(key);
    if (hit) return hit as T;
    const value = await fn();
    await this.redis.set(key, value, ttl);
    return value;
  }

  // ── Business ────────────────────────────────────────────────────────────

  async businessReport(businessId: string, user: AccessUser, q: RangeQuery) {
    await assertBusinessAccess(this.db, businessId, user);
    const { r, prev, g } = this.range(q);
    const key = `analytics:v2:biz:${businessId}:${r.from}:${r.to}:${g}`;
    return this.cached(key, 120, () => this.computeBusiness(businessId, r, prev, g));
  }

  private async eventTotals(businessId: string | null, r: IstRange) {
    const where = businessId ? Prisma.sql`business_id = ${businessId}::uuid AND` : Prisma.empty;
    const rows = await this.db.$queryRaw<{ event: string; total: bigint; visitors: bigint }[]>(Prisma.sql`
      SELECT event, count(*) AS total, count(DISTINCT ${VID}) AS visitors
      FROM analytics_events
      WHERE ${where} created_at >= ${r.start} AND created_at < ${r.end} AND deleted_at IS NULL AND ${HUMAN}
      GROUP BY event`);
    const byGroup = {} as Record<EventGroup, number>;
    for (const g of Object.keys(EVENT_GROUPS) as EventGroup[]) byGroup[g] = 0;
    for (const row of rows) {
      const g = groupOf(row.event);
      if (g) byGroup[g] += n(row.total);
    }
    const distinct = await this.db.$queryRaw<{ viewers: bigint; actors: bigint }[]>(Prisma.sql`
      SELECT
        count(DISTINCT ${VID}) FILTER (WHERE event IN (${Prisma.join(eventsFor('profileView'))})) AS viewers,
        count(DISTINCT ${VID}) FILTER (WHERE event IN (${Prisma.join(eventsFor(...ACTION_GROUPS))})) AS actors
      FROM analytics_events
      WHERE ${where} created_at >= ${r.start} AND created_at < ${r.end} AND deleted_at IS NULL AND ${HUMAN}`);
    return { byGroup, viewers: n(distinct[0]?.viewers), actors: n(distinct[0]?.actors) };
  }

  private async businessOutcomes(businessId: string, r: IstRange) {
    const [claims, spins, vouchers, bills, reviews, customers] = await Promise.all([
      this.db.$queryRaw<{ total: bigint; people: bigint }[]>(Prisma.sql`
        SELECT count(*) AS total, count(DISTINCT r.user_id) AS people
        FROM offer_redemptions r JOIN offers o ON o.id = r.offer_id
        WHERE o.business_id = ${businessId}::uuid AND r.deleted_at IS NULL
          AND r.created_at >= ${r.start} AND r.created_at < ${r.end}`),
      this.db.discountSpin.count({ where: { businessId, deletedAt: null, redeemedAt: { gte: r.start, lt: r.end } } }),
      this.db.voucherClaim.count({ where: { businessId, deletedAt: null, redeemedAt: { gte: r.start, lt: r.end } } }),
      this.db.bill.aggregate({
        where: { businessId, deletedAt: null, status: 'VERIFIED', verifiedAt: { gte: r.start, lt: r.end } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.db.review.aggregate({
        where: { businessId, deletedAt: null, status: { not: 'REMOVED' }, createdAt: { gte: r.start, lt: r.end } },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.db.businessCustomer.count({
        where: { businessId, deletedAt: null, firstInteractionDate: { gte: r.start, lt: r.end } },
      }),
    ]);
    return {
      claims: n(claims[0]?.total),
      claimers: n(claims[0]?.people),
      spinRedemptions: spins,
      voucherRedemptions: vouchers,
      verifiedBills: bills._count._all,
      verifiedSpend: Number(bills._sum.amount ?? 0),
      newReviews: reviews._count._all,
      avgRating: reviews._avg.rating != null ? round1(Number(reviews._avg.rating)) : null,
      newCustomers: customers,
    };
  }

  private async computeBusiness(businessId: string, r: IstRange, prev: IstRange, g: Granularity) {
    const [cur, before, out, outPrev] = await Promise.all([
      this.eventTotals(businessId, r),
      this.eventTotals(businessId, prev),
      this.businessOutcomes(businessId, r),
      this.businessOutcomes(businessId, prev),
    ]);
    const actions = (t: typeof cur) => ACTION_GROUPS.reduce((s, a) => s + t.byGroup[a], 0);
    const rate = (t: typeof cur) => (t.viewers ? round1((t.actors / t.viewers) * 100) : 0);

    const kpis = {
      views: metric(cur.byGroup.profileView, before.byGroup.profileView),
      visitors: metric(cur.viewers, before.viewers),
      actions: metric(actions(cur), actions(before)),
      actionRate: metric(rate(cur), rate(before)),
      calls: metric(cur.byGroup.call, before.byGroup.call),
      directions: metric(cur.byGroup.directions, before.byGroup.directions),
      whatsapp: metric(cur.byGroup.whatsapp, before.byGroup.whatsapp),
      website: metric(cur.byGroup.website, before.byGroup.website),
      shares: metric(cur.byGroup.share, before.byGroup.share),
      saves: metric(cur.byGroup.save, before.byGroup.save),
      qrScans: metric(cur.byGroup.qrScan, before.byGroup.qrScan),
      offerClaims: metric(out.claims, outPrev.claims),
      spinRedemptions: metric(out.spinRedemptions, outPrev.spinRedemptions),
      voucherRedemptions: metric(out.voucherRedemptions, outPrev.voucherRedemptions),
      verifiedBills: metric(out.verifiedBills, outPrev.verifiedBills),
      verifiedSpend: metric(out.verifiedSpend, outPrev.verifiedSpend),
      newReviews: metric(out.newReviews, outPrev.newReviews),
      newCustomers: metric(out.newCustomers, outPrev.newCustomers),
    };

    const [series, sources, devices, heatmap, offers] = await Promise.all([
      this.businessSeries(businessId, r, g),
      this.dimension(businessId, r, 'source'),
      this.dimension(businessId, r, 'device'),
      this.heatmap(businessId, r),
      this.offerTable(businessId, r),
    ]);

    return {
      range: { from: r.from, to: r.to, days: r.days, granularity: g, timezone: 'Asia/Kolkata' },
      previous: { from: prev.from, to: prev.to },
      kpis,
      avgRatingInPeriod: out.avgRating,
      funnel: [
        { stage: 'Unique visitors', value: cur.viewers },
        { stage: 'Took an action', value: cur.actors },
        { stage: 'Claimed an offer', value: out.claimers },
        { stage: 'Verified purchase', value: out.verifiedBills },
      ],
      actionsBreakdown: [
        { key: 'call', label: 'Calls', value: cur.byGroup.call },
        { key: 'directions', label: 'Directions', value: cur.byGroup.directions },
        { key: 'whatsapp', label: 'WhatsApp', value: cur.byGroup.whatsapp },
        { key: 'website', label: 'Website', value: cur.byGroup.website },
      ],
      series,
      sources,
      devices,
      heatmap,
      offers,
      generatedAt: new Date().toISOString(),
    };
  }

  private async businessSeries(businessId: string, r: IstRange, g: Granularity) {
    const views = Prisma.join(eventsFor('profileView'));
    const acts = Prisma.join(eventsFor(...ACTION_GROUPS));
    const [ev, claims, spend] = await Promise.all([
      this.db.$queryRaw<{ d: string; views: bigint; visitors: bigint; actions: bigint }[]>(Prisma.sql`
        SELECT ${istDay('created_at')} AS d,
          count(*) FILTER (WHERE event IN (${views})) AS views,
          count(DISTINCT ${VID}) FILTER (WHERE event IN (${views})) AS visitors,
          count(*) FILTER (WHERE event IN (${acts})) AS actions
        FROM analytics_events
        WHERE business_id = ${businessId}::uuid AND created_at >= ${r.start} AND created_at < ${r.end}
          AND deleted_at IS NULL AND ${HUMAN}
        GROUP BY d`),
      this.db.$queryRaw<{ d: string; claims: bigint }[]>(Prisma.sql`
        SELECT ${istDay('r.created_at')} AS d, count(*) AS claims
        FROM offer_redemptions r JOIN offers o ON o.id = r.offer_id
        WHERE o.business_id = ${businessId}::uuid AND r.deleted_at IS NULL
          AND r.created_at >= ${r.start} AND r.created_at < ${r.end}
        GROUP BY d`),
      this.db.$queryRaw<{ d: string; spend: Prisma.Decimal }[]>(Prisma.sql`
        SELECT ${istDay('verified_at')} AS d, sum(amount) AS spend
        FROM bills
        WHERE business_id = ${businessId}::uuid AND deleted_at IS NULL AND status = 'VERIFIED'
          AND verified_at >= ${r.start} AND verified_at < ${r.end}
        GROUP BY d`),
    ]);

    // Visitors are distinct per day; summing days into weeks/months over-counts returning visitors,
    // so coarser buckets report "visits" semantics and say so via `visitorsAreDailyUnique`.
    const buckets = new Map<string, { date: string; views: number; visitors: number; actions: number; claims: number; spend: number }>();
    for (const day of dayKeys(r)) {
      const k = bucketKey(day, g);
      if (!buckets.has(k)) buckets.set(k, { date: k, views: 0, visitors: 0, actions: 0, claims: 0, spend: 0 });
    }
    const add = (d: string, f: (b: { views: number; visitors: number; actions: number; claims: number; spend: number }) => void) => {
      const b = buckets.get(bucketKey(d, g));
      if (b) f(b);
    };
    ev.forEach((row) =>
      add(row.d, (b) => {
        b.views += n(row.views);
        b.visitors += n(row.visitors);
        b.actions += n(row.actions);
      }),
    );
    claims.forEach((row) => add(row.d, (b) => (b.claims += n(row.claims))));
    spend.forEach((row) => add(row.d, (b) => (b.spend += Number(row.spend ?? 0))));
    return { granularity: g, visitorsAreDailyUnique: g !== 'day', points: [...buckets.values()] };
  }

  private async dimension(businessId: string, r: IstRange, dim: 'source' | 'device') {
    const rows = await this.db.$queryRaw<{ k: string | null; visitors: bigint }[]>(Prisma.sql`
      SELECT coalesce(metadata->>${dim}, 'unknown') AS k, count(DISTINCT ${VID}) AS visitors
      FROM analytics_events
      WHERE business_id = ${businessId}::uuid AND event IN (${Prisma.join(eventsFor('profileView'))})
        AND created_at >= ${r.start} AND created_at < ${r.end} AND deleted_at IS NULL AND ${HUMAN}
      GROUP BY k ORDER BY visitors DESC LIMIT 12`);
    return rows.map((row) => ({ key: row.k ?? 'unknown', visitors: n(row.visitors) }));
  }

  /** Profile views by IST weekday (1=Mon … 7=Sun) × hour. */
  private async heatmap(businessId: string, r: IstRange) {
    const rows = await this.db.$queryRaw<{ dow: number; hour: number; views: bigint }[]>(Prisma.sql`
      SELECT extract(isodow FROM (created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')::int AS dow,
             extract(hour FROM (created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')::int AS hour,
             count(*) AS views
      FROM analytics_events
      WHERE business_id = ${businessId}::uuid AND event IN (${Prisma.join(eventsFor('profileView'))})
        AND created_at >= ${r.start} AND created_at < ${r.end} AND deleted_at IS NULL AND ${HUMAN}
      GROUP BY dow, hour`);
    return rows.map((row) => ({ dow: row.dow, hour: row.hour, views: n(row.views) }));
  }

  private async offerTable(businessId: string, r: IstRange) {
    const offers = await this.db.offer.findMany({
      where: { businessId, deletedAt: null },
      select: { id: true, title: true, status: true, startDate: true, endDate: true, discountPercent: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    if (!offers.length) return [];
    const ids = offers.map((o) => o.id);
    const [claims, clicks] = await Promise.all([
      this.db.offerRedemption.groupBy({
        by: ['offerId'],
        where: { offerId: { in: ids }, deletedAt: null, createdAt: { gte: r.start, lt: r.end } },
        _count: { _all: true },
      }),
      this.db.offerClick.groupBy({
        by: ['offerId'],
        where: { offerKind: 'BUSINESS', offerId: { in: ids }, clickDate: { gte: new Date(`${r.from}T00:00:00Z`), lte: new Date(`${r.to}T00:00:00Z`) } },
        _count: { _all: true },
      }),
    ]);
    const claimMap = new Map(claims.map((c) => [c.offerId, c._count._all]));
    const clickMap = new Map(clicks.map((c) => [c.offerId, c._count._all]));
    return offers.map((o) => {
      const viewers = clickMap.get(o.id) ?? 0;
      const claimed = claimMap.get(o.id) ?? 0;
      return {
        id: o.id,
        title: o.title,
        status: o.status,
        discountPercent: o.discountPercent,
        startDate: o.startDate,
        endDate: o.endDate,
        viewers,
        claims: claimed,
        conversion: viewers ? round1((claimed / viewers) * 100) : null,
      };
    });
  }

  // ── Platform ────────────────────────────────────────────────────────────

  async platformReport(q: RangeQuery) {
    const { r, prev, g } = this.range(q);
    return this.cached(`analytics:v2:platform:${r.from}:${r.to}:${g}`, 180, () => this.computePlatform(r, prev, g));
  }

  private async platformTotals(r: IstRange) {
    const [ev, users, businesses, revenue, gmv, claims] = await Promise.all([
      this.eventTotals(null, r),
      this.db.user.count({ where: { deletedAt: null, role: 'USER', createdAt: { gte: r.start, lt: r.end } } }),
      this.db.business.count({ where: { deletedAt: null, createdAt: { gte: r.start, lt: r.end } } }),
      this.db.transaction.groupBy({
        by: ['cycle'],
        where: { type: 'PAYMENT_VERIFIED', createdAt: { gte: r.start, lt: r.end } },
        _sum: { amountBase: true, amountTax: true },
        _count: { _all: true },
      }),
      this.db.bill.aggregate({
        where: { deletedAt: null, status: 'VERIFIED', verifiedAt: { gte: r.start, lt: r.end } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.db.offerRedemption.count({ where: { deletedAt: null, createdAt: { gte: r.start, lt: r.end } } }),
    ]);
    const rev = (cycle?: string) =>
      revenue.filter((x) => !cycle || x.cycle === cycle).reduce((s, x) => s + Number(x._sum.amountBase ?? 0), 0);
    return {
      visitors: ev.viewers,
      profileViews: ev.byGroup.profileView,
      actions: ACTION_GROUPS.reduce((s, a) => s + ev.byGroup[a], 0),
      searches: ev.byGroup.search,
      newUsers: users,
      newBusinesses: businesses,
      revenue: rev(),
      revenueNew: rev('NEW'),
      revenueRenewal: rev('RENEWAL'),
      gst: revenue.reduce((s, x) => s + Number(x._sum.amountTax ?? 0), 0),
      paidCount: revenue.reduce((s, x) => s + x._count._all, 0),
      gmv: Number(gmv._sum.amount ?? 0),
      verifiedBills: gmv._count._all,
      offerClaims: claims,
    };
  }

  private async computePlatform(r: IstRange, prev: IstRange, g: Granularity) {
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 86400000);
    const [cur, before, snapshot, series, topBusinesses, topCategories, topCities, searches, planMix, statusMix] = await Promise.all([
      this.platformTotals(r),
      this.platformTotals(prev),
      Promise.all([
        this.db.business.count({ where: { deletedAt: null, status: 'APPROVED' } }),
        this.db.business.count({ where: { deletedAt: null, status: { in: ['PENDING_VERIFICATION', 'UNDER_REVIEW'] } } }),
        this.db.payment.count({ where: { deletedAt: null, status: 'PENDING' } }),
        this.db.moderationReport.count({ where: { deletedAt: null, status: 'PENDING' } }),
        this.db.business.count({ where: { deletedAt: null, trialStatus: 'ACTIVE', trialEndDate: { gte: now, lt: in7 } } }),
        this.db.subscription.count({ where: { deletedAt: null, status: 'ACTIVE', endDate: { gte: now, lt: new Date(now.getTime() + 30 * 86400000) } } }),
      ]),
      this.platformSeries(r, g),
      this.db.$queryRaw<{ id: string; name: string; city: string; visitors: bigint }[]>(Prisma.sql`
        SELECT b.id, b.name, b.city, count(DISTINCT ${Prisma.raw(`coalesce(e.metadata->>'visitorId', e.session_id, e.ip_address, e.id::text)`)}) AS visitors
        FROM analytics_events e JOIN businesses b ON b.id = e.business_id
        WHERE e.event IN (${Prisma.join(eventsFor('profileView'))}) AND e.created_at >= ${r.start} AND e.created_at < ${r.end}
          AND e.deleted_at IS NULL AND coalesce((e.metadata->>'isBot')::boolean, false) = false
        GROUP BY b.id, b.name, b.city ORDER BY visitors DESC LIMIT 10`),
      this.db.$queryRaw<{ name: string; visitors: bigint }[]>(Prisma.sql`
        SELECT c.name, count(DISTINCT ${Prisma.raw(`coalesce(e.metadata->>'visitorId', e.session_id, e.ip_address, e.id::text)`)}) AS visitors
        FROM analytics_events e JOIN businesses b ON b.id = e.business_id JOIN business_categories c ON c.id = b.category_id
        WHERE e.event IN (${Prisma.join(eventsFor('profileView'))}) AND e.created_at >= ${r.start} AND e.created_at < ${r.end}
          AND e.deleted_at IS NULL AND coalesce((e.metadata->>'isBot')::boolean, false) = false
        GROUP BY c.name ORDER BY visitors DESC LIMIT 8`),
      this.db.$queryRaw<{ city: string; businesses: bigint }[]>(Prisma.sql`
        SELECT city, count(*) AS businesses FROM businesses
        WHERE deleted_at IS NULL AND status = 'APPROVED' GROUP BY city ORDER BY businesses DESC LIMIT 8`),
      this.db.$queryRaw<{ q: string; total: bigint; zero: bigint }[]>(Prisma.sql`
        SELECT lower(trim(metadata->>'query')) AS q, count(*) AS total,
               count(*) FILTER (WHERE (metadata->>'resultCount')::int = 0 OR event = 'SEARCH_NO_RESULTS') AS zero
        FROM analytics_events
        WHERE event IN (${Prisma.join([...eventsFor('search'), 'SEARCH_NO_RESULTS'])}) AND metadata->>'query' IS NOT NULL
          AND created_at >= ${r.start} AND created_at < ${r.end} AND deleted_at IS NULL AND ${HUMAN}
        GROUP BY q ORDER BY total DESC LIMIT 15`),
      this.db.transaction.groupBy({
        by: ['packageName'],
        where: { type: 'PAYMENT_VERIFIED', createdAt: { gte: r.start, lt: r.end } },
        _sum: { amountBase: true },
        _count: { _all: true },
      }),
      this.db.business.groupBy({
        by: ['status'],
        where: { deletedAt: null, createdAt: { gte: r.start, lt: r.end } },
        _count: { _all: true },
      }),
    ]);

    const [activeBusinesses, pendingApprovals, pendingPayments, openReports, trialsEnding7d, renewalsDue30d] = snapshot;
    const status = (s: string[]) => statusMix.filter((x) => s.includes(x.status)).reduce((a, x) => a + x._count._all, 0);
    const k = (name: keyof typeof cur) => metric(cur[name] as number, before[name] as number);

    return {
      range: { from: r.from, to: r.to, days: r.days, granularity: g, timezone: 'Asia/Kolkata' },
      previous: { from: prev.from, to: prev.to },
      kpis: {
        visitors: k('visitors'),
        profileViews: k('profileViews'),
        actions: k('actions'),
        searches: k('searches'),
        newUsers: k('newUsers'),
        newBusinesses: k('newBusinesses'),
        revenue: k('revenue'),
        revenueNew: k('revenueNew'),
        revenueRenewal: k('revenueRenewal'),
        gst: k('gst'),
        paidCount: k('paidCount'),
        gmv: k('gmv'),
        verifiedBills: k('verifiedBills'),
        offerClaims: k('offerClaims'),
      },
      snapshot: { activeBusinesses, pendingApprovals, pendingPayments, openReports, trialsEnding7d, renewalsDue30d },
      onboardingFunnel: [
        { stage: 'Started', value: status(['DRAFT', 'PENDING_VERIFICATION', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ARCHIVED']) },
        { stage: 'Submitted', value: status(['PENDING_VERIFICATION', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ARCHIVED']) },
        { stage: 'Approved', value: status(['APPROVED', 'SUSPENDED', 'ARCHIVED']) },
      ],
      series,
      topBusinesses: topBusinesses.map((b) => ({ id: b.id, name: b.name, city: b.city, visitors: n(b.visitors) })),
      topCategories: topCategories.map((c) => ({ name: c.name, visitors: n(c.visitors) })),
      cities: topCities.map((c) => ({ city: c.city, businesses: n(c.businesses) })),
      searches: searches.map((s) => ({ query: s.q, total: n(s.total), zeroResults: n(s.zero) })),
      planMix: planMix
        .map((p) => ({ plan: p.packageName ?? 'Other', revenue: Number(p._sum.amountBase ?? 0), count: p._count._all }))
        .sort((a, b) => b.revenue - a.revenue),
      generatedAt: new Date().toISOString(),
    };
  }

  private async platformSeries(r: IstRange, g: Granularity) {
    const [ev, users, biz, rev] = await Promise.all([
      this.db.$queryRaw<{ d: string; visitors: bigint }[]>(Prisma.sql`
        SELECT ${istDay('created_at')} AS d, count(DISTINCT ${VID}) AS visitors
        FROM analytics_events
        WHERE created_at >= ${r.start} AND created_at < ${r.end} AND deleted_at IS NULL AND ${HUMAN}
        GROUP BY d`),
      this.db.$queryRaw<{ d: string; c: bigint }[]>(Prisma.sql`
        SELECT ${istDay('created_at')} AS d, count(*) AS c FROM users
        WHERE deleted_at IS NULL AND role = 'USER' AND created_at >= ${r.start} AND created_at < ${r.end} GROUP BY d`),
      this.db.$queryRaw<{ d: string; c: bigint }[]>(Prisma.sql`
        SELECT ${istDay('created_at')} AS d, count(*) AS c FROM businesses
        WHERE deleted_at IS NULL AND created_at >= ${r.start} AND created_at < ${r.end} GROUP BY d`),
      this.db.$queryRaw<{ d: string; amt: Prisma.Decimal }[]>(Prisma.sql`
        SELECT ${istDay('created_at')} AS d, sum(amount_base) AS amt FROM transactions
        WHERE type = 'PAYMENT_VERIFIED' AND created_at >= ${r.start} AND created_at < ${r.end} GROUP BY d`),
    ]);
    const buckets = new Map<string, { date: string; visitors: number; newUsers: number; newBusinesses: number; revenue: number }>();
    for (const day of dayKeys(r)) {
      const k = bucketKey(day, g);
      if (!buckets.has(k)) buckets.set(k, { date: k, visitors: 0, newUsers: 0, newBusinesses: 0, revenue: 0 });
    }
    const at = (d: string) => buckets.get(bucketKey(d, g));
    ev.forEach((x) => at(x.d) && (at(x.d)!.visitors += n(x.visitors)));
    users.forEach((x) => at(x.d) && (at(x.d)!.newUsers += n(x.c)));
    biz.forEach((x) => at(x.d) && (at(x.d)!.newBusinesses += n(x.c)));
    rev.forEach((x) => at(x.d) && (at(x.d)!.revenue += Number(x.amt ?? 0)));
    return { granularity: g, visitorsAreDailyUnique: g !== 'day', points: [...buckets.values()] };
  }
}
