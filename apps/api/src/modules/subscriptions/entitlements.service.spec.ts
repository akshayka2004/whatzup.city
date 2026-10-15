import { ForbiddenException } from '@nestjs/common';
import { EntitlementsService } from './entitlements.service';

const day = 86_400_000;
const future = (d = 30) => new Date(Date.now() + d * day);

function make(rows: any[], counts: { offers?: number; vouchers?: number } = {}) {
  const db: any = {
    subscription: { findMany: jest.fn(async () => rows) },
    offer: { count: jest.fn(async () => counts.offers ?? 0) },
    voucher: { count: jest.fn(async () => counts.vouchers ?? 0) },
  };
  const store = new Map<string, unknown>();
  const redis: any = {
    get: jest.fn(async (k: string) => store.get(k) ?? null),
    set: jest.fn(async (k: string, v: unknown) => void store.set(k, v)),
    del: jest.fn(async (k: string) => void store.delete(k)),
  };
  return { service: new EntitlementsService(db, redis), db, redis };
}

const row = (packageName: string, over: any = {}) => ({
  packageName,
  kind: packageName.startsWith('ADDON_') ? 'ADDON' : 'BASE',
  billingCycle: 'MONTHLY',
  quantity: 1,
  endDate: future(),
  ...over,
});

describe('EntitlementsService.forBusiness', () => {
  it('Free when nothing is live: 1 offer, 0 vouchers, no analytics', async () => {
    const { service } = make([]);
    const e = await service.forBusiness('b1');
    expect(e).toMatchObject({
      plan: 'FREE',
      source: 'FREE',
      offers: 1,
      vouchers: 0,
      analytics: false,
      expiresAt: null,
    });
  });

  it.each([
    ['SINGLE', 3, 3, false],
    ['SINGLE_AN', 3, 3, true],
    ['MULTI', 3, 3, false],
    ['MULTI_AN', 3, 3, true],
  ])('%s bundle', async (code, offers, vouchers, analytics) => {
    const { service } = make([row(code)]);
    const e = await service.forBusiness('b1');
    expect(e).toMatchObject({ plan: code, source: 'PLAN', offers, vouchers, analytics });
  });

  it('add-on units stack on Free', async () => {
    const { service } = make([row('ADDON_OFFER', { quantity: 2 }), row('ADDON_OV')]);
    const e = await service.forBusiness('b1');
    // Free 1 offer + 2 + 1, vouchers 0 + 0 + 1
    expect(e).toMatchObject({
      offers: 4,
      vouchers: 1,
      analytics: false,
      plan: 'FREE',
      source: 'PLAN',
    });
    expect(e.addons).toHaveLength(2);
  });

  it('add-ons stack on a bundle and an analytics add-on unlocks analytics', async () => {
    const { service } = make([row('SINGLE'), row('ADDON_OV_AN', { quantity: 2 })]);
    const e = await service.forBusiness('b1');
    expect(e).toMatchObject({ plan: 'SINGLE', offers: 5, vouchers: 5, analytics: true });
  });

  it('grandfathers legacy plans (analytics kept, source LEGACY)', async () => {
    const { service } = make([row('WHTZUP_PLUS', { billingCycle: 'QUARTERLY', kind: 'BASE' })]);
    const e = await service.forBusiness('b1');
    expect(e).toMatchObject({
      plan: 'WHTZUP_PLUS',
      source: 'LEGACY',
      offers: 3,
      vouchers: 3,
      analytics: true,
    });
  });

  it('hotel and launch-offer legacy rows are honoured', async () => {
    const hotel = await make([row('HOTEL_4STAR')]).service.forBusiness('h');
    expect(hotel).toMatchObject({ source: 'LEGACY', analytics: true });
    const launch = await make([row('LAUNCH_SPECIAL')]).service.forBusiness('l');
    expect(launch.offers).toBeGreaterThanOrEqual(1000);
  });

  it('ignores retired auto-assigned packages (they never counted as paid)', async () => {
    const { service } = make([row('LISTING_BASIC')]);
    const e = await service.forBusiness('b1');
    expect(e.source).toBe('FREE');
  });

  it('expiresAt is the soonest live end date', async () => {
    const soon = future(5);
    const { service } = make([
      row('SINGLE', { endDate: future(300) }),
      row('ADDON_OV', { endDate: soon }),
    ]);
    const e = await service.forBusiness('b1');
    expect(new Date(e.expiresAt as string).getTime()).toBe(soon.getTime());
  });

  it('caches for a minute and invalidate() clears it', async () => {
    const { service, db } = make([row('SINGLE')]);
    await service.forBusiness('b1');
    await service.forBusiness('b1');
    expect(db.subscription.findMany).toHaveBeenCalledTimes(1);
    await service.invalidate('b1');
    await service.forBusiness('b1');
    expect(db.subscription.findMany).toHaveBeenCalledTimes(2);
  });
});

describe('EntitlementsService limits', () => {
  it('allows going live under the limit and rejects at it with PLAN_LIMIT', async () => {
    const free = make([], { offers: 0 });
    await expect(free.service.assertCanGoLive('b1', 'offer')).resolves.toBeUndefined();

    const full = make([], { offers: 1 });
    const err: any = await full.service.assertCanGoLive('b1', 'offer').catch((e) => e);
    expect(err).toBeInstanceOf(ForbiddenException);
    expect(err.getResponse()).toMatchObject({
      code: 'PLAN_LIMIT',
      details: { resource: 'offer', limit: 1, used: 1 },
    });
  });

  it('Free cannot publish any voucher', async () => {
    const { service } = make([], { vouchers: 0 });
    const err: any = await service.assertCanGoLive('b1', 'voucher').catch((e) => e);
    expect(err.getResponse()).toMatchObject({
      code: 'PLAN_LIMIT',
      details: { resource: 'voucher', limit: 0 },
    });
  });

  it('a bundle with add-ons raises the ceiling', async () => {
    const { service } = make([row('SINGLE'), row('ADDON_OFFER')], { offers: 3 });
    await expect(service.assertCanGoLive('b1', 'offer')).resolves.toBeUndefined(); // 3 used < 4
  });

  it('excludes the row being re-activated from its own count', async () => {
    const { service, db } = make([], { offers: 1 });
    await service.assertCanGoLive('b1', 'offer', 'offer-1').catch(() => {});
    expect(db.offer.count.mock.calls[0][0].where).toMatchObject({ NOT: { id: 'offer-1' } });
  });

  it('analytics feature gate', async () => {
    const free = make([]);
    const err: any = await free.service.assertFeature('b1', 'analytics').catch((e) => e);
    expect(err.getResponse()).toMatchObject({ code: 'PLAN_FEATURE' });
    const paid = make([row('SINGLE_AN')]);
    await expect(paid.service.assertFeature('b1', 'analytics')).resolves.toBeUndefined();
  });
});
