import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@saas/types';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { VouchersController } from './vouchers.controller';
import { RewardsAdminService, WATCH } from './rewards-admin.service';

const DAY = 86_400_000;
const NOW = Date.parse('2026-11-26T06:30:00Z');

const voucher = (over: any = {}) => ({
  id: 'v1',
  tenantId: 't1',
  title: 'Free dessert',
  status: 'ACTIVE',
  endDate: new Date(NOW + 10 * DAY),
  thresholdAmount: 1000,
  rewardType: 'AMOUNT',
  rewardValue: 100,
  rewardLabel: null,
  repeatable: false,
  spendWindow: 'SINCE_START',
  audience: {},
  maxRedemptions: 10,
  currentClaims: 4,
  createdAt: new Date(NOW - DAY),
  business: { id: 'biz1', name: 'Cafe Joy', city: 'Kochi' },
  ...over,
});

function setup(
  over: {
    vouchers?: any[];
    claims?: any[];
    pairs?: any[];
    staff?: any[];
    perBusiness?: any[];
    billTotals?: any[];
  } = {},
) {
  const db: any = {
    voucher: {
      findMany: jest.fn(async () => over.vouchers ?? [voucher()]),
      count: jest.fn(async () => (over.vouchers ?? [voucher()]).length),
      findFirst: jest.fn(
        async ({ where }: any) =>
          (over.vouchers ?? [voucher()]).find((v) => v.id === where.id) ?? null,
      ),
      update: jest.fn(async () => ({})),
    },
    voucherClaim: {
      findMany: jest.fn(
        async () =>
          over.claims ?? [
            { voucherId: 'v1', status: 'UNLOCKED', expiresAt: new Date(NOW + 5 * DAY) },
            { voucherId: 'v1', status: 'UNLOCKED', expiresAt: new Date(NOW - 5 * DAY) }, // expired: not owed
            { voucherId: 'v1', status: 'REDEEMED', expiresAt: new Date(NOW + 5 * DAY) },
            { voucherId: 'v1', status: 'REDEEMED', expiresAt: new Date(NOW + 5 * DAY) },
          ],
      ),
    },
    counterBill: {
      groupBy: jest.fn(async ({ by }: any) =>
        by.length === 2 ? (over.pairs ?? []) : (over.perBusiness ?? []),
      ),
      findMany: jest.fn(async () => over.staff ?? []),
    },
    bill: { groupBy: jest.fn(async () => over.billTotals ?? []) },
    business: { findMany: jest.fn(async () => [{ id: 'biz1', name: 'Cafe Joy', city: 'Kochi' }]) },
  };
  const audit: any = { log: jest.fn() };
  return { svc: new RewardsAdminService(db, audit), db, audit };
}

describe('the platform view of business rewards', () => {
  it('lists rewards with what has been handed out, what is still open, and what a flat reward owes', async () => {
    const { svc } = setup();
    const out = await svc.overview({}, NOW);
    expect(out.data[0]).toMatchObject({
      title: 'Free dessert',
      claimed: 4,
      redeemed: 2,
      open: 1, // the expired code no longer counts
      slotsLeft: 6,
      owed: 100, // 1 open code x ₹100
      given: 200,
      business: { name: 'Cafe Joy' },
    });
    expect(out.summary).toMatchObject({ live: 1, owed: 100, openCodes: 1 });
    expect(out.meta).toMatchObject({ total: 1, page: 1 });
  });

  it('does not invent a price for a percent or free-item reward', async () => {
    const { svc } = setup({ vouchers: [voucher({ rewardType: 'PERCENT', rewardValue: 10 })] });
    const out = await svc.overview({}, NOW);
    expect(out.data[0].owed).toBeNull();
    expect(out.data[0].given).toBeNull();
  });

  it('filters by status and searches the reward or business name', async () => {
    const { svc, db } = setup();
    await svc.overview({ status: 'LIVE', search: ' joy ' }, NOW);
    const where = db.voucher.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('ACTIVE');
    expect(where.endDate.gte).toBeInstanceOf(Date);
    expect(where.OR).toHaveLength(2);
    await svc.overview({ status: 'ENDED' }, NOW);
    expect(db.voucher.findMany.mock.calls[1][0].where.endDate.lt).toBeInstanceOf(Date);
  });
});

describe('the watch list', () => {
  it('is empty when nothing looks odd', async () => {
    const { svc } = setup();
    expect(await svc.watchList(NOW)).toEqual([]);
  });

  it('flags one customer with many Quick pay bills at the same business', async () => {
    const { svc } = setup({
      pairs: [
        {
          businessId: 'biz1',
          userId: 'u1',
          _count: { _all: WATCH.sameCustomer },
          _sum: { amount: 4200 },
        },
        { businessId: 'biz1', userId: 'u2', _count: { _all: 2 }, _sum: { amount: 300 } },
      ],
    });
    const flags = await svc.watchList(NOW);
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      kind: 'SAME_CUSTOMER',
      businessId: 'biz1',
      business: { name: 'Cafe Joy' },
    });
    expect(flags[0].text).toContain('₹4,200');
  });

  it('flags a staff member who entered a very large number in one day, once', async () => {
    const day = new Date(NOW - 2 * DAY);
    const rows = Array.from({ length: WATCH.staffPerDay }, () => ({
      businessId: 'biz1',
      staffId: 's1',
      decidedAt: day,
    }));
    const { svc } = setup({ staff: rows });
    const flags = await svc.watchList(NOW);
    expect(flags.map((f) => f.kind)).toEqual(['STAFF_VOLUME']);
    expect(flags[0].severity).toBe('CHECK');
  });

  it('does not flag volume spread over several days', async () => {
    const rows = Array.from({ length: WATCH.staffPerDay }, (_, i) => ({
      businessId: 'biz1',
      staffId: 's1',
      decidedAt: new Date(NOW - i * DAY),
    }));
    const { svc } = setup({ staff: rows });
    expect(await svc.watchList(NOW)).toEqual([]);
  });

  it('flags a business where nearly all verified bills are typed at the counter, but not a small one', async () => {
    const big = setup({
      perBusiness: [{ businessId: 'biz1', _count: { _all: 40 } }],
      billTotals: [{ businessId: 'biz1', _count: { _all: 42 } }],
    });
    expect((await big.svc.watchList(NOW)).map((f) => f.kind)).toEqual(['ALL_COUNTER']);
    const mixed = setup({
      perBusiness: [{ businessId: 'biz1', _count: { _all: 40 } }],
      billTotals: [{ businessId: 'biz1', _count: { _all: 100 } }],
    });
    expect(await mixed.svc.watchList(NOW)).toEqual([]);
    const small = setup({
      perBusiness: [{ businessId: 'biz1', _count: { _all: 5 } }],
      billTotals: [{ businessId: 'biz1', _count: { _all: 5 } }],
    });
    expect(await small.svc.watchList(NOW)).toEqual([]);
  });
});

describe('an admin pausing a reward', () => {
  it('pauses it and writes an audit entry; a no-op writes nothing', async () => {
    const { svc, db, audit } = setup();
    await expect(svc.setStatus({ id: 'adm' }, 'v1', 'PAUSED')).resolves.toEqual({
      id: 'v1',
      status: 'PAUSED',
    });
    expect(db.voucher.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'PAUSED', updatedBy: 'adm' } }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'VOUCHER_PAUSED_BY_ADMIN', userId: 'adm' }),
    );
    db.voucher.update.mockClear();
    audit.log.mockClear();
    await svc.setStatus({ id: 'adm' }, 'v1', 'ACTIVE');
    expect(db.voucher.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('refuses other statuses and unknown rewards', async () => {
    const { svc } = setup();
    await expect(svc.setStatus({ id: 'adm' }, 'v1', 'ARCHIVED')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(svc.setStatus({ id: 'adm' }, 'nope', 'PAUSED')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('who may see the platform view', () => {
  const roles = (fn: any) => Reflect.getMetadata(ROLES_KEY, fn);
  const proto = VouchersController.prototype;
  it('only master and super admins', () => {
    expect(roles(proto.adminOverview)).toEqual([UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN]);
    expect(roles(proto.adminSetStatus)).toEqual([UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN]);
  });
  it('the business and customer routes are not role-locked', () => {
    for (const fn of [proto.claim, proto.wallet, proto.redeem, proto.create])
      expect(roles(fn)).toBeUndefined();
  });
});
