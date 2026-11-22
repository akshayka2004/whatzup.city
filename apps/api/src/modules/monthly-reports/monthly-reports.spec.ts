import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@saas/types';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { MonthlyReportsController } from './monthly-reports.controller';
import { MonthlyReportsService } from './monthly-reports.service';
import {
  maskName,
  monthWindow,
  pctChange,
  reportCsv,
  topSpenderBy,
  type SpendRow,
} from './monthly-report.util';

describe('monthWindow (India time)', () => {
  it('a month starts at midnight India time and ends at the next one', () => {
    const w = monthWindow('2026-11')!;
    expect(w.key).toBe('2026-11');
    expect(w.start.toISOString()).toBe('2026-10-31T18:30:00.000Z');
    expect(w.end.toISOString()).toBe('2026-11-30T18:30:00.000Z');
    expect(w.prevStart.toISOString()).toBe('2026-09-30T18:30:00.000Z');
    expect(w.days).toBe(30);
    expect(w.label).toBe('November 2026');
  });

  it('handles February, leap years and the year turning over', () => {
    expect(monthWindow('2027-02')!.days).toBe(28);
    expect(monthWindow('2028-02')!.days).toBe(29);
    const jan = monthWindow('2027-01')!;
    expect(jan.prevStart.toISOString()).toBe('2026-11-30T18:30:00.000Z');
    expect(monthWindow('2026-12')!.end.toISOString()).toBe('2026-12-31T18:30:00.000Z');
  });

  it('no month means the current month in India, even just after midnight there', () => {
    // 2026-11-30 19:00 UTC is already 1 December 00:30 in India.
    const w = monthWindow(undefined, Date.parse('2026-11-30T19:00:00Z'))!;
    expect(w.key).toBe('2026-12');
  });

  it('refuses a malformed month', () => {
    for (const bad of ['2026-13', '2026-00', '26-11', 'november', '2026/11', '1999-01', '']) {
      if (bad === '') continue; // empty means "this month"
      expect(monthWindow(bad)).toBeNull();
    }
  });

  it('flags a month that has not started', () => {
    expect(monthWindow('2099-01')!.futureStart).toBe(true);
    expect(monthWindow('2026-01', Date.parse('2026-06-01T00:00:00Z'))!.futureStart).toBe(false);
  });
});

describe('topSpenderBy', () => {
  const rows: SpendRow[] = [
    { businessId: 'b1', userId: 'a', amount: 500, bills: 1 },
    { businessId: 'b1', userId: 'b', amount: 900, bills: 2 },
    { businessId: 'b2', userId: 'a', amount: 700, bills: 1 },
    { businessId: 'b2', userId: 'c', amount: 100, bills: 1 },
  ];

  it('picks the biggest spender at each business', () => {
    const m = topSpenderBy(rows, (r) => r.businessId);
    expect(m.get('b1')).toMatchObject({ userId: 'b', amount: 900 });
    expect(m.get('b2')).toMatchObject({ userId: 'a', amount: 700 });
  });

  it('adds up one person across the outlets of a category', () => {
    // a: 500 + 700 = 1200 in category X beats b's 900.
    const m = topSpenderBy(rows, () => 'X');
    expect(m.get('X')).toMatchObject({ userId: 'a', amount: 1200, bills: 2 });
  });

  it('breaks a tie the same way every time (more bills, then smaller id)', () => {
    const tie: SpendRow[] = [
      { businessId: 'b', userId: 'z', amount: 100, bills: 1 },
      { businessId: 'b', userId: 'm', amount: 100, bills: 3 },
      { businessId: 'b', userId: 'a', amount: 100, bills: 3 },
    ];
    expect(topSpenderBy(tie, (r) => r.businessId).get('b')!.userId).toBe('a');
    expect(topSpenderBy([...tie].reverse(), (r) => r.businessId).get('b')!.userId).toBe('a');
  });

  it('skips rows with no key and handles an empty list', () => {
    expect(topSpenderBy(rows, () => undefined).size).toBe(0);
    expect(topSpenderBy([], (r) => r.businessId).size).toBe(0);
  });
});

describe('small helpers', () => {
  it('masks a customer name for a business owner', () => {
    expect(maskName('Asha Nair')).toBe('Asha N.');
    expect(maskName('Asha Devi Nair')).toBe('Asha N.');
    expect(maskName('Asha')).toBe('Asha');
    expect(maskName('')).toBe('Customer');
    expect(maskName(null)).toBe('Customer');
  });

  it('percent change is null when there is nothing to compare', () => {
    expect(pctChange(150, 100)).toBe(50);
    expect(pctChange(50, 100)).toBe(-50);
    expect(pctChange(10, 0)).toBeNull();
  });
});

// ── the service, with a stub database ────────────────────────────────────────

const TENANT = 't1';
const biz = (id: string, name: string, catId: string, catName: string, city = 'Kochi') => ({
  id,
  name,
  city,
  category: { id: catId, name: catName },
});

function setup(over: any = {}) {
  const db: any = {
    business: {
      findMany: jest.fn(async () => [
        biz('b1', 'Grand Hotel', 'c-hotel', 'Hotel'),
        biz('b2', 'Spice Cafe', 'c-food', 'Restaurant', 'Kozhikode'),
        biz('b3', 'Quiet Inn', 'c-hotel', 'Hotel', 'Munnar'),
      ]),
    },
    category: { findMany: jest.fn(async () => []) },
    analyticsEvent: {
      groupBy: jest.fn(async () => [
        { businessId: 'b1', event: 'BUSINESS_VIEW', _count: { _all: 40 } },
        { businessId: 'b1', event: 'PROFILE_VIEW', _count: { _all: 10 } },
        { businessId: 'b1', event: 'PHONE_CLICK', _count: { _all: 5 } },
        { businessId: 'b2', event: 'DIRECTIONS_CLICK', _count: { _all: 3 } },
      ]),
    },
    bill: {
      groupBy: jest.fn(async ({ by, where }: any) => {
        const prev = where.billDate.lt.toISOString() === '2026-10-31T18:30:00.000Z';
        if (by.length === 2) {
          return [
            { businessId: 'b1', userId: 'u1', _sum: { amount: 4000 }, _count: { _all: 2 } },
            { businessId: 'b1', userId: 'u2', _sum: { amount: 9000 }, _count: { _all: 1 } },
            { businessId: 'b2', userId: 'u1', _sum: { amount: 3000 }, _count: { _all: 3 } },
            { businessId: 'b3', userId: 'u3', _sum: { amount: 500 }, _count: { _all: 1 } },
          ];
        }
        return prev
          ? [{ businessId: 'b1', _sum: { amount: 6500 }, _count: { _all: 2 } }]
          : [
              { businessId: 'b1', _sum: { amount: 13000 }, _count: { _all: 3 } },
              { businessId: 'b2', _sum: { amount: 3000 }, _count: { _all: 3 } },
              { businessId: 'b3', _sum: { amount: 500 }, _count: { _all: 1 } },
            ];
      }),
    },
    favorite: {
      groupBy: jest.fn(async () => [
        { businessId: 'b2', _count: { _all: 7 } },
        { businessId: 'b1', _count: { _all: 2 } },
      ]),
    },
    review: { groupBy: jest.fn(async () => [{ businessId: 'b1', _count: { _all: 4 } }]) },
    user: {
      groupBy: jest.fn(async () => [
        { role: 'USER', _count: { _all: 90 } },
        { role: 'BUSINESS_OWNER', _count: { _all: 10 } },
      ]),
      count: jest.fn(async ({ where }: any) => (where.lastLoginAt ? 33 : where.referredBy ? 2 : 8)),
      findMany: jest.fn(async ({ where }: any) =>
        where.id
          ? [
              { id: 'u1', name: 'Asha Nair', email: 'a@x.com' },
              { id: 'u2', name: 'Ravi Menon', email: 'r@x.com' },
              { id: 'u3', name: 'Tina Joseph', email: 't@x.com' },
            ]
          : [
              { createdAt: new Date('2026-11-03T05:00:00Z'), role: 'USER' },
              { createdAt: new Date('2026-11-03T06:00:00Z'), role: 'USER' },
              { createdAt: new Date('2026-11-10T06:00:00Z'), role: 'BUSINESS_OWNER' },
            ],
      ),
    },
    ...over,
  };
  return { svc: new MonthlyReportsService(db), db };
}

describe('the monthly report for the platform admins', () => {
  it('rejects a bad month with a plain message', async () => {
    const { svc } = setup();
    await expect(svc.build('nope', { tenantId: TENANT })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rolls up users, new users and sign-ups per day', async () => {
    const { svc } = setup();
    const r = await svc.build('2026-11', { tenantId: TENANT });
    expect(r.scope).toBe('platform');
    expect(r.users).toMatchObject({ total: 100, regular: 90, activeThisMonth: 33 });
    expect(r.newUsers).toMatchObject({ total: 3, regular: 2, referred: 2 });
    expect(r.newUsers!.byDay).toHaveLength(30);
    expect(r.newUsers!.byDay.find((d) => d.day === '2026-11-03')!.count).toBe(2);
    expect(r.newUsers!.byDay.find((d) => d.day === '2026-11-10')!.count).toBe(1);
  });

  it('counts business analytics from every alias of an event', async () => {
    const { svc } = setup();
    const r = await svc.build('2026-11', { tenantId: TENANT });
    const grand = r.businesses.find((b) => b.name === 'Grand Hotel')!;
    expect(grand).toMatchObject({
      views: 50,
      calls: 5,
      saves: 2,
      bills: 3,
      revenue: 13000,
      reviews: 4,
    });
    const cafe = r.businesses.find((b) => b.name === 'Spice Cafe')!;
    expect(cafe).toMatchObject({ directions: 3, saves: 7, revenue: 3000 });
    // Biggest revenue first.
    expect(r.businesses.map((b) => b.name)).toEqual(['Grand Hotel', 'Spice Cafe', 'Quiet Inn']);
  });

  it('adds revenue up by category, with share and change against last month', async () => {
    const { svc } = setup();
    const r = await svc.build('2026-11', { tenantId: TENANT });
    expect(r.revenueByCategory[0]).toMatchObject({
      category: 'Hotel',
      revenue: 13500,
      bills: 4,
      businesses: 2,
    });
    expect(r.revenueByCategory[0].change).toBe(107.7); // 13500 vs 6500
    expect(r.revenueByCategory[1]).toMatchObject({ category: 'Restaurant', revenue: 3000 });
    expect(r.revenueByCategory[1].change).toBeNull(); // nothing last month
    expect(r.revenueByCategory.reduce((a, c) => a + c.share, 0)).toBeCloseTo(100, 0);
    expect(r.totals).toMatchObject({ revenue: 16500, previousRevenue: 6500, bills: 7 });
  });

  it('finds the top spender per business and per category with full names', async () => {
    const { svc } = setup();
    const r = await svc.build('2026-11', { tenantId: TENANT });
    const grand = r.topSpenders.byBusiness.find((s) => s.business === 'Grand Hotel')!;
    expect(grand).toMatchObject({ name: 'Ravi Menon', amount: 9000 });
    const hotel = r.topSpenders.byCategory.find((s) => s.category === 'Hotel')!;
    expect(hotel).toMatchObject({ name: 'Ravi Menon', amount: 9000 });
    const food = r.topSpenders.byCategory.find((s) => s.category === 'Restaurant')!;
    expect(food).toMatchObject({ name: 'Asha Nair', amount: 3000 });
  });

  it('lists the most saved businesses as wishlist interest', async () => {
    const { svc } = setup();
    const r = await svc.build('2026-11', { tenantId: TENANT });
    expect(r.interest.totalSaves).toBe(9);
    expect(r.interest.topSaved[0]).toMatchObject({ name: 'Spice Cafe', saves: 7 });
  });

  it('only counts verified bills, inside the month window', async () => {
    const { svc, db } = setup();
    await svc.build('2026-11', { tenantId: TENANT });
    for (const call of db.bill.groupBy.mock.calls) {
      expect(call[0].where.status).toBe('VERIFIED');
      expect(call[0].where.deletedAt).toBeNull();
    }
    const now = db.bill.groupBy.mock.calls.find((c: any) => c[0].by.length === 1)[0].where;
    expect(now.billDate.gte.toISOString()).toBe('2026-10-31T18:30:00.000Z');
    expect(now.billDate.lt.toISOString()).toBe('2026-11-30T18:30:00.000Z');
  });

  it('narrows to one category when asked', async () => {
    const { svc, db } = setup();
    await svc.build('2026-11', { tenantId: TENANT, categoryId: 'c-hotel' });
    expect(db.business.findMany.mock.calls[0][0].where.categoryId).toBe('c-hotel');
  });

  it('a month with nothing in it gives an empty but valid report', async () => {
    const empty = {
      business: { findMany: jest.fn(async () => []) },
    };
    const { svc } = setup(empty);
    const r = await svc.build('2026-11', { tenantId: TENANT });
    expect(r.businesses).toEqual([]);
    expect(r.revenueByCategory).toEqual([]);
    expect(r.topSpenders.byBusiness).toEqual([]);
    expect(r.totals.revenue).toBe(0);
    expect(r.totals.revenueChange).toBeNull();
  });
});

describe('the report for one business owner', () => {
  it('has no platform user sections, only their businesses, and masks customer names', async () => {
    const { svc, db } = setup();
    db.business.findMany.mockImplementation(async () => [
      biz('b1', 'Grand Hotel', 'c-hotel', 'Hotel'),
    ]);
    const r = await svc.build('2026-11', { tenantId: TENANT, businessIds: ['b1'] });
    expect(r.scope).toBe('mine');
    expect(r.users).toBeNull();
    expect(r.newUsers).toBeNull();
    expect(db.user.groupBy).not.toHaveBeenCalled();
    expect(db.business.findMany.mock.calls[0][0].where.id).toEqual({ in: ['b1'] });
    const spender = r.topSpenders.byBusiness[0];
    expect(spender.name).toBe('Ravi M.');
    expect(JSON.stringify(r)).not.toContain('Menon');
    expect(JSON.stringify(r)).not.toContain('@x.com');
  });

  it('an owner with no businesses gets an empty report and no queries on other businesses', async () => {
    const { svc, db } = setup();
    db.business.findMany.mockImplementation(async () => []);
    const r = await svc.build('2026-11', { tenantId: TENANT, businessIds: [] });
    expect(r.businesses).toEqual([]);
    expect(db.bill.groupBy).not.toHaveBeenCalled();
    expect(db.analyticsEvent.groupBy).not.toHaveBeenCalled();
  });

  it('finds the businesses a person owns, co-manages or owns through a brand', async () => {
    const { svc, db } = setup();
    db.business.findMany.mockImplementation(async () => [{ id: 'b1' }, { id: 'b9' }]);
    await expect(svc.businessIdsFor('u1', TENANT)).resolves.toEqual(['b1', 'b9']);
    const where = db.business.findMany.mock.calls[0][0].where;
    expect(where.tenantId).toBe(TENANT);
    expect(where.OR).toHaveLength(3);
  });
});

describe('the CSV download', () => {
  it('has every section, and does not let a business name run as a formula', async () => {
    const { svc, db } = setup();
    db.business.findMany.mockImplementation(async () => [
      biz('b1', '=HYPERLINK("http://evil")', 'c-hotel', 'Hotel'),
    ]);
    const r = await svc.build('2026-11', { tenantId: TENANT });
    const csv = reportCsv(r);
    for (const title of [
      'Users',
      'New users from the portal',
      'New users by day',
      'Hotel / business analytics',
      'Wishlists and interest',
      'Revenue by category (verified bills)',
      'Highest spender in each business',
      'Highest spender in each category',
    ]) {
      expect(csv).toContain(title);
    }
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(csv).not.toMatch(/(^|,)=HYPERLINK/m);
  });

  it('an owner report CSV leaves out the platform user tables', async () => {
    const { svc } = setup();
    const r = await svc.build('2026-11', { tenantId: TENANT, businessIds: ['b1'] });
    const csv = reportCsv(r);
    expect(csv).not.toContain('New users from the portal');
    expect(csv).toContain('Revenue by category');
  });
});

describe('who may read the reports', () => {
  const roles = (fn: any) => Reflect.getMetadata(ROLES_KEY, fn);
  const proto = MonthlyReportsController.prototype;
  it('the platform report is for the two admin roles only', () => {
    for (const fn of [proto.report, proto.csv, proto.categories]) {
      expect(roles(fn)).toEqual([UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN]);
    }
  });
  it('the own-business report is for business owners and moderators, not admins or customers', () => {
    for (const fn of [proto.mine, proto.mineCsv]) {
      const r = roles(fn);
      expect(r).toContain(UserRole.BUSINESS_OWNER);
      expect(r).toContain(UserRole.BUSINESS_MODERATOR);
      expect(r).not.toContain(UserRole.USER);
      expect(r).not.toContain(UserRole.MASTER_ADMIN);
    }
  });
});
