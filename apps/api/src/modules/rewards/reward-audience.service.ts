// ============================================================
// Audience matching. A business describes the customer it wants ("spent ₹3,000 at cafes in 60 days,
// in Kochi, not been here for 60 days"); this decides whether one customer fits, and how many do.
// The business only ever gets a rounded count, never names: see shownAudienceCount.
// ============================================================

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import {
  Audience,
  AudienceFacts,
  audienceIsSet,
  audienceMatches,
  normalizeAudience,
  shownAudienceCount,
} from './reward-rules';

const DAY_MS = 86_400_000;
const CANDIDATE_CAP = 20_000;

@Injectable()
export class RewardAudienceService {
  constructor(private readonly db: DatabaseService) {}

  /** The category ids a spend rule covers: the ones picked plus everything under them. */
  async expandCategories(ids: string[]): Promise<string[]> {
    if (!ids.length) return [];
    // tenant-scope-ok: categories are platform-wide; only ids and parents are read
    const rows = await this.db.category.findMany({
      where: { deletedAt: null, OR: [{ id: { in: ids } }, { parentId: { in: ids } }] },
      select: { id: true },
    });
    return [...new Set([...ids, ...rows.map((r) => r.id)])];
  }

  /** What we know about one customer, only as much as the audience needs. */
  async factsFor(
    userId: string,
    businessId: string,
    audience: Audience,
    now = Date.now(),
  ): Promise<AudienceFacts> {
    let categorySpend = 0;
    if (audience.categoryIds?.length) {
      const cats = await this.expandCategories(audience.categoryIds);
      const since = new Date(now - (audience.windowDays ?? 60) * DAY_MS);
      // tenant-scope-ok: a customer's spend is read across businesses and tenants by design
      const agg = await this.db.verifiedPurchase.aggregate({
        where: {
          userId,
          deletedAt: null,
          purchaseDate: { gte: since },
          business: { categoryId: { in: cats } },
        },
        _sum: { amount: true },
      });
      categorySpend = Number(agg._sum.amount ?? 0);
    }

    let cities: string[] = [];
    if (audience.cities?.length) {
      const [profile, bought] = await Promise.all([
        // tenant-scope-ok: looked up by the customer's own user id
        this.db.customer.findFirst({ where: { userId, deletedAt: null }, select: { city: true } }),
        // tenant-scope-ok: a customer's purchases across businesses
        this.db.verifiedPurchase.findMany({
          where: { userId, deletedAt: null, purchaseDate: { gte: new Date(now - 180 * DAY_MS) } },
          select: { business: { select: { city: true } } },
          take: 200,
        }),
      ]);
      cities = [profile?.city, ...bought.map((b) => b.business?.city)].filter(Boolean) as string[];
    }

    let lastPurchaseHere: Date | null = null;
    if (audience.customerType && audience.customerType !== 'ANY') {
      // tenant-scope-ok: customer + business pair
      const last = await this.db.verifiedPurchase.aggregate({
        where: { userId, businessId, deletedAt: null },
        _max: { purchaseDate: true },
      });
      lastPurchaseHere = last._max.purchaseDate ?? null;
    }
    return { categorySpend, cities, lastPurchaseHere };
  }

  /** Does this customer fit the voucher's audience? No audience means everyone. */
  async matches(
    voucher: { businessId: string; audience: unknown },
    userId: string,
    now = Date.now(),
  ): Promise<boolean> {
    const audience = normalizeAudience(voucher.audience);
    if (!audienceIsSet(audience)) return true;
    const facts = await this.factsFor(userId, voucher.businessId, audience, now);
    return audienceMatches(audience, facts, now);
  }

  /**
   * How many customers fit, for the "about N people" line while a business sets a reward up.
   * Built from people who had a bill verified on the platform in the last 6 months. A small group is
   * reported as "fewer than 10" so a business cannot narrow the rules down to a single person.
   */
  async preview(businessId: string, raw: unknown, now = Date.now()) {
    const audience = normalizeAudience(raw);
    if (!audienceIsSet(audience)) {
      return {
        audience,
        everyone: true,
        count: null as number | null,
        label: 'Everyone who visits',
      };
    }
    const since180 = new Date(now - 180 * DAY_MS);
    let candidates: string[];
    const spendBy = new Map<string, number>();
    if (audience.categoryIds?.length) {
      const cats = await this.expandCategories(audience.categoryIds);
      const since = new Date(now - (audience.windowDays ?? 60) * DAY_MS);
      // tenant-scope-ok: platform-wide count of customers by spend; returns no identities
      const rows = await this.db.verifiedPurchase.groupBy({
        by: ['userId'],
        where: {
          deletedAt: null,
          purchaseDate: { gte: since },
          business: { categoryId: { in: cats } },
        },
        _sum: { amount: true },
        orderBy: { userId: 'asc' },
        take: CANDIDATE_CAP,
      });
      for (const r of rows) spendBy.set(r.userId, Number(r._sum.amount ?? 0));
      candidates = [...spendBy.keys()];
    } else {
      // tenant-scope-ok: platform-wide count; returns no identities
      const rows = await this.db.verifiedPurchase.groupBy({
        by: ['userId'],
        where: { deletedAt: null, purchaseDate: { gte: since180 } },
        orderBy: { userId: 'asc' },
        take: CANDIDATE_CAP,
      });
      candidates = rows.map((r) => r.userId);
    }
    if (!candidates.length) return { audience, everyone: false, ...shownAudienceCount(0) };

    const needCities = !!audience.cities?.length;
    const needLast = !!audience.customerType && audience.customerType !== 'ANY';
    const cityBy = new Map<string, string[]>();
    const lastBy = new Map<string, Date>();
    if (needCities) {
      const [profiles, bought] = await Promise.all([
        // tenant-scope-ok: platform-wide count
        this.db.customer.findMany({
          where: { userId: { in: candidates }, deletedAt: null },
          select: { userId: true, city: true },
        }),
        // tenant-scope-ok: platform-wide count
        this.db.verifiedPurchase.groupBy({
          by: ['userId', 'businessId'],
          where: { userId: { in: candidates }, deletedAt: null, purchaseDate: { gte: since180 } },
          _count: { _all: true },
        }),
      ]);
      const bizIds = [...new Set(bought.map((b) => b.businessId))];
      // tenant-scope-ok: only the city column of businesses people bought from
      const biz = bizIds.length
        ? await this.db.business.findMany({
            where: { id: { in: bizIds } },
            select: { id: true, city: true },
          })
        : [];
      const bizCity = new Map(biz.map((b) => [b.id, b.city]));
      for (const p of profiles) if (p.city) cityBy.set(p.userId, [p.city]);
      for (const b of bought) {
        const c = bizCity.get(b.businessId);
        if (c) cityBy.set(b.userId, [...(cityBy.get(b.userId) ?? []), c]);
      }
    }
    if (needLast) {
      // tenant-scope-ok: platform-wide count
      const last = await this.db.verifiedPurchase.groupBy({
        by: ['userId'],
        where: { userId: { in: candidates }, businessId, deletedAt: null },
        _max: { purchaseDate: true },
      });
      for (const l of last) if (l._max.purchaseDate) lastBy.set(l.userId, l._max.purchaseDate);
    }

    let n = 0;
    for (const uid of candidates) {
      const ok = audienceMatches(
        audience,
        {
          categorySpend: spendBy.get(uid) ?? 0,
          cities: cityBy.get(uid) ?? [],
          lastPurchaseHere: lastBy.get(uid) ?? null,
        },
        now,
      );
      if (ok) n++;
    }
    return {
      audience,
      everyone: false,
      capped: candidates.length >= CANDIDATE_CAP,
      ...shownAudienceCount(n),
    };
  }
}
