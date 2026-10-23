import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import {
  addEntitlements,
  catalogueItem,
  entitlementsOf,
  FREE_CODE,
  FREE_ENTITLEMENTS,
  INCLUDED_PLAN_CODE,
  INCLUDED_PLAN_ENTITLEMENTS,
  isLegacyPackage,
  type BillingCycle,
  type Entitlements,
} from '@saas/types';
import { DatabaseService } from '../../common/database/database.service';
import { assertBusinessAccess, type AccessUser } from '../../common/utils/business-access';
import { RedisService } from '../../common/redis/redis.service';
import { paymentsEnabled } from '../../common/utils/payments-flag';

export type EntitlementSource = 'FREE' | 'PLAN' | 'LEGACY';

export interface BusinessEntitlements extends Entitlements {
  /** Bundle code ('FREE' when the business has no live bundle). */
  plan: string;
  cycle: BillingCycle | null;
  source: EntitlementSource;
  /** Soonest end date among the live paid rows (drives renewal reminders), or null on Free. */
  expiresAt: string | null;
  addons: { code: string; quantity: number; expiresAt: string }[];
}

export interface EntitlementsWithUsage extends BusinessEntitlements {
  usage: { offers: number; vouchers: number };
}

export type LimitedResource = 'offer' | 'voucher';

const CACHE_TTL_SECONDS = 60;
const cacheKey = (businessId: string) => `entitlements:${businessId}`;

/**
 * Single source of truth for "what is this business allowed to have live right now".
 *
 *  - Free is the floor (1 offer, 0 vouchers, no analytics) — a lapsed plan never locks the account.
 *  - A live BASE bundle (new catalogue or a grandfathered legacy plan) replaces the Free numbers.
 *  - Every live ADDON row adds its units × quantity on top.
 *  - Expiry is lazy: a row only counts while status = ACTIVE and endDate >= now.
 */
@Injectable()
export class EntitlementsService {
  private readonly logger = new Logger(EntitlementsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  /** Call after a payment is verified or a subscription changes. */
  async invalidate(businessId: string) {
    try {
      await this.redis.del(cacheKey(businessId));
    } catch {
      /* cache is an optimisation only */
    }
  }

  async forBusiness(businessId: string): Promise<BusinessEntitlements> {
    try {
      const cached = await this.redis.get<BusinessEntitlements>(cacheKey(businessId));
      if (cached) return cached;
    } catch {
      /* fall through to the database */
    }
    const computed = await this.compute(businessId);
    try {
      await this.redis.set(cacheKey(businessId), computed, CACHE_TTL_SECONDS);
    } catch {
      /* ignore */
    }
    return computed;
  }

  private async compute(businessId: string): Promise<BusinessEntitlements> {
    // Payments dormant: everyone is on the one included plan, whatever the subscription rows say.
    if (!paymentsEnabled()) {
      return {
        ...INCLUDED_PLAN_ENTITLEMENTS,
        plan: INCLUDED_PLAN_CODE,
        cycle: null,
        source: 'PLAN',
        expiresAt: null,
        addons: [],
      };
    }
    // tenant-scope-ok: subscriptions are read by business id, which is already a single tenant's row
    const rows = await this.db.subscription.findMany({
      where: {
        businessId,
        status: 'ACTIVE',
        deletedAt: null,
        endDate: { gte: new Date() },
      },
      orderBy: { endDate: 'desc' },
      select: {
        packageName: true,
        kind: true,
        billingCycle: true,
        quantity: true,
        endDate: true,
      },
    });

    const bases: typeof rows = [];
    const addons: typeof rows = [];
    for (const r of rows) {
      const paid = !!catalogueItem(r.packageName) || isLegacyPackage(r.packageName);
      if (!paid) continue; // retired auto-assigned packages never counted as a paid plan
      const isAddon = r.kind === 'ADDON' || catalogueItem(r.packageName)?.kind === 'ADDON';
      (isAddon ? addons : bases).push(r);
    }

    // One bundle should be live; if data ever holds two, the most generous wins.
    let base: Entitlements = { ...FREE_ENTITLEMENTS };
    let plan = FREE_CODE;
    let cycle: BillingCycle | null = null;
    let source: EntitlementSource = 'FREE';
    for (const b of bases) {
      const e = entitlementsOf(b.packageName);
      if (!e) continue;
      const better =
        source === 'FREE' ||
        e.offers + e.vouchers + (e.analytics ? 1 : 0) >
          base.offers + base.vouchers + (base.analytics ? 1 : 0);
      if (better) {
        base = e;
        plan = b.packageName;
        cycle = b.billingCycle as BillingCycle;
        source = isLegacyPackage(b.packageName) ? 'LEGACY' : 'PLAN';
      }
    }

    let total = base;
    for (const a of addons) {
      const e = entitlementsOf(a.packageName);
      if (e) total = addEntitlements(total, e, Math.max(1, a.quantity));
    }

    const live = [...bases, ...addons];
    const expiresAt = live.length
      ? new Date(Math.min(...live.map((r) => r.endDate.getTime()))).toISOString()
      : null;

    return {
      ...total,
      plan,
      cycle,
      source: source === 'FREE' && addons.length ? 'PLAN' : source,
      expiresAt,
      addons: addons.map((a) => ({
        code: a.packageName,
        quantity: Math.max(1, a.quantity),
        expiresAt: a.endDate.toISOString(),
      })),
    };
  }

  /** What the dashboard shows: entitlements, live usage, and how far over the limit (after a downgrade). */
  async forUser(businessId: string, user: AccessUser) {
    const biz = await assertBusinessAccess(this.db, businessId, user);
    const e = await this.withUsage(biz.id);
    return {
      ...e,
      businessId: biz.id,
      overLimit: {
        offers: Math.max(0, e.usage.offers - e.offers),
        vouchers: Math.max(0, e.usage.vouchers - e.vouchers),
      },
    };
  }

  /** Live offers/vouchers: ACTIVE and not past their end date. */
  async usage(businessId: string) {
    const now = new Date();
    const where = { businessId, status: 'ACTIVE' as const, deletedAt: null, endDate: { gte: now } };
    // tenant-scope-ok: counted per business id
    const [offers, vouchers] = await Promise.all([
      this.db.offer.count({ where }),
      this.db.voucher.count({ where }),
    ]);
    return { offers, vouchers };
  }

  async withUsage(businessId: string): Promise<EntitlementsWithUsage> {
    const [e, usage] = await Promise.all([this.forBusiness(businessId), this.usage(businessId)]);
    return { ...e, usage };
  }

  /**
   * Throws a 403 PLAN_LIMIT if making one more offer/voucher live would exceed the plan.
   * `excludeId` is the row being re-activated/edited so it doesn't count against itself.
   */
  async assertCanGoLive(businessId: string, resource: LimitedResource, excludeId?: string) {
    const ent = await this.forBusiness(businessId);
    const limit = resource === 'offer' ? ent.offers : ent.vouchers;
    const now = new Date();
    const where = {
      businessId,
      status: 'ACTIVE' as const,
      deletedAt: null,
      endDate: { gte: now },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    };
    // tenant-scope-ok: counted per business id
    const used =
      resource === 'offer'
        ? await this.db.offer.count({ where })
        : await this.db.voucher.count({ where });
    if (used < limit) return;

    const noun = resource === 'offer' ? 'offer' : 'voucher';
    const dormant = !paymentsEnabled();
    const message = dormant
      ? `You can have ${limit} live ${noun}${limit === 1 ? '' : 's'} at a time and ${used === 1 ? 'one is' : `${used} are`} live. Pause or end one to add another.`
      : limit === 0
        ? `Vouchers are not part of your current plan. Upgrade or add a voucher pack to publish one.`
        : `Your plan allows ${limit} live ${noun}${limit === 1 ? '' : 's'} and you are using ${used}. Pause one or upgrade to add more.`;
    throw new ForbiddenException({
      statusCode: 403,
      message,
      code: 'PLAN_LIMIT',
      details: {
        resource,
        limit,
        used,
        plan: ent.plan,
        ...(dormant ? {} : { upgradeUrl: '/dashboard/subscriptions' }),
      },
    });
  }

  /** Throws 403 PLAN_FEATURE when the business has no analytics entitlement. */
  async assertFeature(businessId: string, feature: 'analytics') {
    const ent = await this.forBusiness(businessId);
    if (ent[feature]) return;
    throw new ForbiddenException({
      statusCode: 403,
      message: 'Analytics is not part of your current plan. Upgrade to see performance insights.',
      code: 'PLAN_FEATURE',
      details: { feature, plan: ent.plan, upgradeUrl: '/dashboard/subscriptions' },
    });
  }
}
