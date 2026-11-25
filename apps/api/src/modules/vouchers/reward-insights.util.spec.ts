import {
  Purchase,
  change,
  cohorts,
  dailySeries,
  dormancy,
  inWindow,
  overview,
  pct,
  redeemerUplift,
  spendBands,
  topCustomers,
  visitFrequency,
  weekdays,
} from './reward-insights.util';

const DAY = 86_400_000;
// Wednesday 25 Nov 2026, 10:00 India time.
const NOW = Date.parse('2026-11-25T04:30:00Z');
const at = (daysAgo: number) => NOW - daysAgo * DAY;
const p = (userId: string, amount: number, daysAgo: number): Purchase => ({
  userId,
  amount,
  at: at(daysAgo),
});

describe('small helpers', () => {
  it('percent and change handle zero', () => {
    expect(pct(1, 4)).toBe(25);
    expect(pct(1, 0)).toBeNull();
    expect(change(150, 100)).toBe(50);
    expect(change(5, 0)).toBeNull();
  });
  it('inWindow takes the start, not the end', () => {
    const ps = [p('a', 1, 5), p('a', 1, 10)];
    expect(inWindow(ps, at(7), at(0))).toHaveLength(1);
    expect(inWindow(ps, at(10), at(5))).toHaveLength(1); // at(10) is included, at(5) is not
  });
});

describe('overview', () => {
  const from = at(30);
  const to = NOW;
  const ps = [p('a', 500, 2), p('a', 700, 9), p('b', 1000, 4), p('c', 300, 20)];
  const first = new Map([
    ['a', at(100)], // old customer
    ['b', at(4)], // new this month
    ['c', at(20)], // new this month
  ]);
  it('adds revenue, bills, customers, new vs returning and the repeat rate', () => {
    const o = overview(ps, first, from, to);
    expect(o).toMatchObject({
      revenue: 2500,
      bills: 4,
      customers: 3,
      avgBill: 625,
      newCustomers: 2,
      returningCustomers: 1,
    });
    expect(o.avgPerCustomer).toBeCloseTo(833.33, 2);
    expect(o.repeatRate).toBe(33.3); // only "a" bought twice
  });
  it('an empty period is all zeros, never NaN', () => {
    expect(overview([], new Map(), from, to)).toEqual({
      revenue: 0,
      bills: 0,
      customers: 0,
      avgBill: 0,
      avgPerCustomer: 0,
      newCustomers: 0,
      returningCustomers: 0,
      repeatRate: null,
    });
  });
});

describe('daily series and weekdays', () => {
  it('has a row for every day, quiet ones included', () => {
    const rows = dailySeries([p('a', 100, 1)], at(7), NOW);
    expect(rows).toHaveLength(7);
    expect(rows.filter((r) => r.bills > 0)).toEqual([
      { day: '2026-11-24', revenue: 100, bills: 1 },
    ]);
  });
  it('weekdays start on Monday and put each bill on its India-time day', () => {
    const rows = weekdays([p('a', 100, 0), p('b', 50, 1), p('c', 25, 3)]);
    expect(rows.map((r) => r.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(rows.find((r) => r.label === 'Wed')).toMatchObject({ revenue: 100, bills: 1 });
    expect(rows.find((r) => r.label === 'Tue')).toMatchObject({ revenue: 50, bills: 1 });
    expect(rows.find((r) => r.label === 'Sun')).toMatchObject({ revenue: 25, bills: 1 });
  });
  it('a bill just after midnight India time counts for the new day', () => {
    // 00:30 IST on Thursday = 19:00 UTC on Wednesday.
    const late: Purchase = { userId: 'a', amount: 10, at: Date.parse('2026-11-25T19:00:00Z') };
    expect(weekdays([late]).find((r) => r.label === 'Thu')!.bills).toBe(1);
  });
});

describe('spend bands and visit frequency', () => {
  const ps = [
    p('a', 100, 1),
    p('b', 600, 1),
    p('b', 500, 2),
    p('c', 6000, 1),
    p('d', 200, 1),
    p('d', 200, 2),
    p('d', 200, 3),
  ];
  it('groups customers by what they spent in total', () => {
    const bands = spendBands(ps);
    expect(bands.map((b) => b.customers)).toEqual([1, 1, 1, 0, 1]); // a 100, d 600, b 1100, c 6000
  });
  it('counts customers by number of visits', () => {
    const f = visitFrequency([
      ...ps,
      p('e', 1, 1),
      p('e', 1, 2),
      p('e', 1, 3),
      p('e', 1, 4),
      p('e', 1, 5),
    ]);
    expect(f).toEqual([
      { label: '1 visit', customers: 2 },
      { label: '2 visits', customers: 1 },
      { label: '3 to 4 visits', customers: 1 },
      { label: '5 or more', customers: 1 },
    ]);
  });
});

describe('cohorts', () => {
  it('shows what share of each first-purchase month came back later', () => {
    const ps = [
      // two customers start in September; one returns in October
      { userId: 'a', amount: 1, at: Date.parse('2026-09-10T06:00:00Z') },
      { userId: 'a', amount: 1, at: Date.parse('2026-10-12T06:00:00Z') },
      { userId: 'b', amount: 1, at: Date.parse('2026-09-20T06:00:00Z') },
      // one starts in October and returns in November
      { userId: 'c', amount: 1, at: Date.parse('2026-10-02T06:00:00Z') },
      { userId: 'c', amount: 1, at: Date.parse('2026-11-02T06:00:00Z') },
    ];
    const rows = cohorts(ps, 3, NOW);
    expect(rows.map((r) => r.month)).toEqual(['2026-09', '2026-10']);
    expect(rows[0]).toMatchObject({ customers: 2, m1: 50, m2: 0, m3: null });
    expect(rows[1]).toMatchObject({ customers: 1, m1: 100, m2: null, m3: null });
  });
  it('a month nobody first bought in is left out', () => {
    expect(cohorts([], 6, NOW)).toEqual([]);
  });
});

describe('dormancy', () => {
  it('counts repeat customers who have gone quiet or are slipping', () => {
    const ps = [
      p('a', 1, 90),
      p('a', 1, 100), // quiet (90 days)
      p('b', 1, 40),
      p('b', 1, 80), // slipping (40 days)
      p('c', 1, 5),
      p('c', 1, 50), // active
      p('d', 1, 120), // single visit: not counted
    ];
    expect(dormancy(ps, NOW)).toEqual({ slipping: 1, quiet: 1 });
  });
});

describe('top customers', () => {
  it('ranks by spend, then visits, and is stable on ties', () => {
    const top = topCustomers([p('b', 100, 1), p('a', 100, 2), p('a', 0, 3), p('c', 900, 1)], 2);
    expect(top.map((t) => t.userId)).toEqual(['c', 'a']);
    expect(top[1]).toMatchObject({ spend: 100, visits: 2 });
  });
});

describe('spend before and after a reward is used', () => {
  it('compares 30 days either side, only for redemptions old enough to have a full 30 days after', () => {
    const redeems = [
      { userId: 'a', at: at(60) },
      { userId: 'b', at: at(10) }, // too recent
    ];
    const ps = [p('a', 100, 80), p('a', 300, 50), p('a', 999, 100), p('b', 5, 15)];
    const u = redeemerUplift(redeems, ps, NOW);
    expect(u).toMatchObject({ people: 1, before: 100, after: 300, change: 200 });
  });
  it('no redemptions gives zeros and no percentage', () => {
    expect(redeemerUplift([], [], NOW)).toEqual({ people: 0, before: 0, after: 0, change: null });
  });
});
