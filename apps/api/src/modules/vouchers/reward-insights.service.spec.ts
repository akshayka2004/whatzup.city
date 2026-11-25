import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RewardInsightsService } from './reward-insights.service';

const DAY = 86_400_000;
const NOW = Date.parse('2026-11-25T04:30:00Z');
const ago = (d: number) => new Date(NOW - d * DAY);

function setup(opts: { manager?: boolean } = {}) {
  const purchases = [
    { userId: 'u1', amount: 600, purchaseDate: ago(3) },
    { userId: 'u1', amount: 400, purchaseDate: ago(10) },
    { userId: 'u2', amount: 1500, purchaseDate: ago(5) },
    { userId: 'u3', amount: 200, purchaseDate: ago(40) }, // the period before
  ];
  const db: any = {
    business: {
      findFirst: jest.fn(async (args: any) => {
        const w = args?.select?.staff?.where;
        // The first lookup is by id/entityId for the name; the access check also selects staff.
        const isManager = opts.manager !== false;
        return {
          id: 'biz1',
          name: 'Cafe Joy',
          ownerId: isManager ? 'owner' : 'someone',
          brand: null,
          staff: w ? [] : undefined,
        };
      }),
    },
    verifiedPurchase: {
      findMany: jest.fn(async () => purchases),
      groupBy: jest.fn(async () => [
        { userId: 'u1', _min: { purchaseDate: ago(100) } },
        { userId: 'u2', _min: { purchaseDate: ago(5) } },
        { userId: 'u3', _min: { purchaseDate: ago(40) } },
      ]),
    },
    user: {
      findMany: jest.fn(async () => [
        { id: 'u1', name: 'Asha Nair' },
        { id: 'u2', name: 'Ravi Menon' },
        { id: 'staff1', name: 'Tina Joseph' },
      ]),
    },
    voucher: {
      findMany: jest.fn(async () => [
        {
          id: 'v1',
          title: 'Free dessert',
          status: 'ACTIVE',
          spendWindow: 'SINCE_START',
          repeatable: false,
          audience: { cities: ['Kochi'] },
          thresholdAmount: 1000,
          rewardType: 'AMOUNT',
          rewardValue: 100,
          maxRedemptions: 10,
          currentClaims: 4,
          endDate: new Date(NOW + 10 * DAY),
        },
      ]),
    },
    rewardEvent: {
      groupBy: jest.fn(async () => [
        { voucherId: 'v1', kind: 'NEAR', _count: { _all: 6 } },
        { voucherId: 'v1', kind: 'READY', _count: { _all: 5 } },
        { voucherId: 'v1', kind: 'CLAIMED', _count: { _all: 4 } },
        { voucherId: 'v1', kind: 'REDEEMED', _count: { _all: 2 } },
      ]),
    },
    voucherClaim: {
      findMany: jest.fn(async (args: any) =>
        args?.orderBy
          ? [
              {
                redeemedAt: ago(1),
                redeemedBy: 'staff1',
                userId: 'u1',
                redeemAmount: 900,
                voucher: { title: 'Free dessert' },
              },
            ]
          : [
              {
                voucherId: 'v1',
                userId: 'u1',
                status: 'REDEEMED',
                unlockedAt: ago(5),
                redeemedAt: ago(3),
                expiresAt: ago(-20),
                redeemAmount: 900,
              },
              {
                voucherId: 'v1',
                userId: 'u2',
                status: 'REDEEMED',
                unlockedAt: ago(4),
                redeemedAt: ago(2),
                expiresAt: ago(-20),
                redeemAmount: null,
              },
              {
                voucherId: 'v1',
                userId: 'u4',
                status: 'UNLOCKED',
                unlockedAt: ago(2),
                redeemedAt: null,
                expiresAt: ago(-20),
                redeemAmount: null,
              },
              {
                voucherId: 'v1',
                userId: 'u5',
                status: 'UNLOCKED',
                unlockedAt: ago(60),
                redeemedAt: null,
                expiresAt: ago(10),
                redeemAmount: null,
              },
            ],
      ),
    },
    billVerification: {
      count: jest.fn(async () => 3),
      aggregate: jest.fn(async () => ({ _min: { createdAt: new Date(NOW - 30 * 3_600_000) } })),
      findMany: jest.fn(async () => [
        {
          status: 'APPROVED',
          createdAt: ago(2),
          verifiedAt: new Date(ago(2).getTime() + 2 * 3_600_000),
        },
        {
          status: 'APPROVED',
          createdAt: ago(3),
          verifiedAt: new Date(ago(3).getTime() + 40 * 3_600_000),
        },
        { status: 'REJECTED', createdAt: ago(4), verifiedAt: null },
        { status: 'PENDING', createdAt: ago(1), verifiedAt: null },
      ]),
    },
    bill: {
      groupBy: jest.fn(async ({ by }: any) =>
        by[0] === 'source'
          ? [
              { source: 'COUNTER', _count: { _all: 2 } },
              { source: 'PHOTO', _count: { _all: 5 } },
            ]
          : by[0] === 'orderChannel'
            ? [
                { orderChannel: 'IN_STORE', _count: { _all: 6 } },
                { orderChannel: null, _count: { _all: 1 } },
              ]
            : [{ paymentMode: 'UPI', _count: { _all: 7 } }],
      ),
    },
  };
  return { service: new RewardInsightsService(db), db };
}

describe('business insights', () => {
  it('rolls up revenue, customers and the change since the period before', async () => {
    const { service } = setup();
    const r = await service.forBusiness({ id: 'owner' }, 'biz1', 30, NOW);
    expect(r.range.days).toBe(30);
    expect(r.overview).toMatchObject({
      revenue: 2500,
      bills: 3,
      customers: 2,
      newCustomers: 1, // u2 first bought 5 days ago
      returningCustomers: 1,
      previous: { revenue: 200, bills: 1 },
    });
    expect(r.overview.revenueChange).toBe(1150);
    expect(r.daily).toHaveLength(30);
    expect(r.weekdays).toHaveLength(7);
    expect(r.cohorts.length).toBeGreaterThan(0);
  });

  it('shows customers as a first name and an initial, and never an email or id', async () => {
    const { service } = setup();
    const r = await service.forBusiness({ id: 'owner' }, 'biz1', 30, NOW);
    expect(r.topCustomers.map((t) => t.name)).toEqual(['Ravi M.', 'Asha N.']);
    expect(r.redemptions[0]).toMatchObject({
      customer: 'Asha N.',
      staff: 'Tina Joseph',
      billAmount: 900,
    });
    const json = JSON.stringify(r);
    expect(json).not.toContain('Menon');
    expect(json).not.toContain('Nair');
    expect(json).not.toContain('u1');
  });

  it('builds the reward funnel, the cost and the unused codes', async () => {
    const { service } = setup();
    const r = await service.forBusiness({ id: 'owner' }, 'biz1', 30, NOW);
    const v = r.rewards.list[0];
    expect(v).toMatchObject({
      title: 'Free dessert',
      targeted: true,
      funnel: { near: 6, ready: 5, claimed: 4, redeemed: 2 },
      unusedOpen: 1,
      unusedExpired: 1,
      claimsTotal: 4,
      cost: 200, // two redeemed, ₹100 each
      slotsLeft: 6,
      readyToClaimedRate: 80,
    });
    expect(v.claimedToUsedRate).toBe(50);
    expect(r.rewards.totals).toMatchObject({ claimed: 4, redeemed: 2, cost: 200, unusedOpen: 1 });
  });

  it('shows how fast bills get approved', async () => {
    const { service } = setup();
    const r = await service.forBusiness({ id: 'owner' }, 'biz1', 30, NOW);
    expect(r.operations).toMatchObject({
      pending: 3,
      oldestPendingHours: 30,
      approved: 2,
      rejected: 1,
      approvalRate: 66.7,
      slowShare: 50, // one of the two took over 24 hours
    });
    expect(r.billMix.source).toEqual([
      { label: 'COUNTER', bills: 2 },
      { label: 'PHOTO', bills: 5 },
    ]);
    expect(r.billMix.channel[1]).toEqual({ label: 'Not asked', bills: 1 });
  });

  it('is for owners and managers, not for other businesses', async () => {
    const { service } = setup({ manager: false });
    await expect(service.forBusiness({ id: 'stranger' }, 'biz1', 30, NOW)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('a business that does not exist is not found', async () => {
    const { service, db } = setup();
    db.business.findFirst = jest.fn(async () => null);
    await expect(service.forBusiness({ id: 'owner' }, 'nope', 30, NOW)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('keeps the period between a week and half a year', async () => {
    const { service } = setup();
    expect((await service.forBusiness({ id: 'owner' }, 'biz1', 1, NOW)).range.days).toBe(7);
    expect((await service.forBusiness({ id: 'owner' }, 'biz1', 9999, NOW)).range.days).toBe(180);
    expect((await service.forBusiness({ id: 'owner' }, 'biz1', Number.NaN, NOW)).range.days).toBe(
      30,
    );
  });

  it('a business with no rewards and no sales gets empty but valid numbers', async () => {
    const { service, db } = setup();
    db.verifiedPurchase.findMany = jest.fn(async () => []);
    db.verifiedPurchase.groupBy = jest.fn(async () => []);
    db.voucher.findMany = jest.fn(async () => []);
    db.billVerification.findMany = jest.fn(async () => []);
    db.billVerification.count = jest.fn(async () => 0);
    db.billVerification.aggregate = jest.fn(async () => ({ _min: { createdAt: null } }));
    db.voucherClaim.findMany = jest.fn(async () => []);
    const r = await service.forBusiness({ id: 'owner' }, 'biz1', 30, NOW);
    expect(r.overview).toMatchObject({
      revenue: 0,
      bills: 0,
      customers: 0,
      repeatRate: null,
      revenueChange: null,
    });
    expect(r.rewards).toEqual({ list: [], totals: null, uplift: null });
    expect(r.operations).toMatchObject({
      pending: 0,
      oldestPendingHours: null,
      approvalRate: null,
      medianHoursToApprove: null,
    });
    expect(r.topCustomers).toEqual([]);
  });
});
