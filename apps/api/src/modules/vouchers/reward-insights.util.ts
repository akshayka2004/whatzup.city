// Pure number-crunching for the business insights page: no database, so it is easy to test.
// A "purchase" is one verified bill: who, how much, when.

export type Purchase = { userId: string; amount: number; at: number };

const IST_OFFSET_MS = 5.5 * 3_600_000;
const DAY_MS = 86_400_000;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** India-time calendar day, "2026-11-25". */
export const dayOf = (at: number) => new Date(at + IST_OFFSET_MS).toISOString().slice(0, 10);
const monthOf = (at: number) => dayOf(at).slice(0, 7);
const weekdayOf = (at: number) => new Date(at + IST_OFFSET_MS).getUTCDay(); // 0 = Sunday

export const pct = (part: number, whole: number): number | null =>
  whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;

export function change(now: number, before: number): number | null {
  if (!before) return null;
  return Math.round(((now - before) / before) * 1000) / 10;
}

export const inWindow = (ps: Purchase[], from: number, to: number) =>
  ps.filter((p) => p.at >= from && p.at < to);

/** Totals for one stretch of time. `firstEver` says when each customer first bought here, to split new from returning. */
export function overview(ps: Purchase[], firstEver: Map<string, number>, from: number, to: number) {
  const revenue = ps.reduce((a, p) => a + p.amount, 0);
  const perUser = new Map<string, { spend: number; visits: number }>();
  for (const p of ps) {
    const cur = perUser.get(p.userId) ?? { spend: 0, visits: 0 };
    cur.spend += p.amount;
    cur.visits += 1;
    perUser.set(p.userId, cur);
  }
  let newC = 0;
  let returning = 0;
  let repeaters = 0;
  for (const [uid, v] of perUser) {
    const first = firstEver.get(uid);
    if (first !== undefined && first >= from && first < to) newC++;
    else returning++;
    if (v.visits >= 2) repeaters++;
  }
  const customers = perUser.size;
  return {
    revenue: round2(revenue),
    bills: ps.length,
    customers,
    avgBill: ps.length ? round2(revenue / ps.length) : 0,
    avgPerCustomer: customers ? round2(revenue / customers) : 0,
    newCustomers: newC,
    returningCustomers: returning,
    repeatRate: pct(repeaters, customers),
  };
}

/** One row per day in the window, including quiet days, so a chart has no gaps. */
export function dailySeries(ps: Purchase[], from: number, to: number) {
  const days = new Map<string, { revenue: number; bills: number }>();
  for (let t = from; t < to; t += DAY_MS) days.set(dayOf(t), { revenue: 0, bills: 0 });
  for (const p of ps) {
    const d = days.get(dayOf(p.at));
    if (d) {
      d.revenue += p.amount;
      d.bills += 1;
    }
  }
  return [...days.entries()].map(([day, v]) => ({
    day,
    revenue: round2(v.revenue),
    bills: v.bills,
  }));
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Revenue and bills by day of the week, Monday first. */
export function weekdays(ps: Purchase[]) {
  const rows = WEEKDAYS.map((label) => ({ label, revenue: 0, bills: 0 }));
  for (const p of ps) {
    const r = rows[weekdayOf(p.at)];
    r.revenue += p.amount;
    r.bills += 1;
  }
  const out = [...rows.slice(1), rows[0]];
  return out.map((r) => ({ ...r, revenue: round2(r.revenue) }));
}

export const SPEND_BANDS = [
  { label: 'Under ₹500', min: 0, max: 500 },
  { label: '₹500 to ₹1,000', min: 500, max: 1000 },
  { label: '₹1,000 to ₹2,500', min: 1000, max: 2500 },
  { label: '₹2,500 to ₹5,000', min: 2500, max: 5000 },
  { label: '₹5,000 and above', min: 5000, max: Infinity },
];

/** How many customers fall in each total-spend band over the window. */
export function spendBands(ps: Purchase[]) {
  const spend = new Map<string, number>();
  for (const p of ps) spend.set(p.userId, (spend.get(p.userId) ?? 0) + p.amount);
  return SPEND_BANDS.map((b) => ({
    label: b.label,
    customers: [...spend.values()].filter((s) => s >= b.min && s < b.max).length,
  }));
}

/** How many customers came once, twice, 3 to 4 times, 5 or more. */
export function visitFrequency(ps: Purchase[]) {
  const visits = new Map<string, number>();
  for (const p of ps) visits.set(p.userId, (visits.get(p.userId) ?? 0) + 1);
  const v = [...visits.values()];
  return [
    { label: '1 visit', customers: v.filter((n) => n === 1).length },
    { label: '2 visits', customers: v.filter((n) => n === 2).length },
    { label: '3 to 4 visits', customers: v.filter((n) => n >= 3 && n <= 4).length },
    { label: '5 or more', customers: v.filter((n) => n >= 5).length },
  ];
}

/**
 * Cohorts by the month of a customer's first purchase here, and what share came back in each of the
 * next three months. A month with no one in it is skipped.
 */
export function cohorts(ps: Purchase[], months = 6, now = Date.now()) {
  const monthsOf = new Map<string, Set<string>>(); // userId -> months with a purchase
  for (const p of ps) {
    const set = monthsOf.get(p.userId) ?? new Set<string>();
    set.add(monthOf(p.at));
    monthsOf.set(p.userId, set);
  }
  const nth = (base: string, add: number) => {
    const [y, m] = base.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + add, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  };
  const thisMonth = monthOf(now);
  const out: {
    month: string;
    customers: number;
    m1: number | null;
    m2: number | null;
    m3: number | null;
  }[] = [];
  for (let back = months - 1; back >= 0; back--) {
    const month = nth(thisMonth, -back);
    const members = [...monthsOf.entries()].filter(([, set]) => {
      const first = [...set].sort()[0];
      return first === month;
    });
    if (!members.length) continue;
    const share = (k: number) => {
      const target = nth(month, k);
      if (target > thisMonth) return null; // the future has not happened yet
      const returned = members.filter(([, set]) => set.has(target)).length;
      return pct(returned, members.length);
    };
    out.push({ month, customers: members.length, m1: share(1), m2: share(2), m3: share(3) });
  }
  return out;
}

/** Customers with 2+ purchases whose last visit is old: gone quiet (60+ days) or slipping (30 to 60). */
export function dormancy(ps: Purchase[], now: number) {
  const last = new Map<string, number>();
  const count = new Map<string, number>();
  for (const p of ps) {
    last.set(p.userId, Math.max(last.get(p.userId) ?? 0, p.at));
    count.set(p.userId, (count.get(p.userId) ?? 0) + 1);
  }
  let slipping = 0;
  let quiet = 0;
  for (const [uid, at] of last) {
    if ((count.get(uid) ?? 0) < 2) continue;
    const days = (now - at) / DAY_MS;
    if (days > 60) quiet++;
    else if (days > 30) slipping++;
  }
  return { slipping, quiet };
}

/** Top spenders in the window. `nameOf` turns an id into a display name (the caller masks it). */
export function topCustomers(ps: Purchase[], limit: number) {
  const m = new Map<string, { spend: number; visits: number; last: number }>();
  for (const p of ps) {
    const cur = m.get(p.userId) ?? { spend: 0, visits: 0, last: 0 };
    cur.spend += p.amount;
    cur.visits += 1;
    cur.last = Math.max(cur.last, p.at);
    m.set(p.userId, cur);
  }
  return [...m.entries()]
    .map(([userId, v]) => ({ userId, spend: round2(v.spend), visits: v.visits, last: v.last }))
    .sort((a, b) => b.spend - a.spend || b.visits - a.visits || a.userId.localeCompare(b.userId))
    .slice(0, limit);
}

/**
 * Did customers spend more after redeeming a reward? Compares what each redeemer spent in the 30 days
 * before the redemption with the 30 days after it. A rough guide, not proof: say so where it is shown.
 */
export function redeemerUplift(
  redeems: { userId: string; at: number }[],
  ps: Purchase[],
  now: number,
) {
  let before = 0;
  let after = 0;
  let people = 0;
  const byUser = new Map<string, Purchase[]>();
  for (const p of ps) byUser.set(p.userId, [...(byUser.get(p.userId) ?? []), p]);
  for (const r of redeems) {
    // Only redemptions with a full 30 days since, so "after" is not cut short.
    if (now - r.at < 30 * DAY_MS) continue;
    const mine = byUser.get(r.userId) ?? [];
    before += mine
      .filter((p) => p.at >= r.at - 30 * DAY_MS && p.at < r.at)
      .reduce((a, p) => a + p.amount, 0);
    after += mine
      .filter((p) => p.at > r.at && p.at <= r.at + 30 * DAY_MS)
      .reduce((a, p) => a + p.amount, 0);
    people++;
  }
  return { people, before: round2(before), after: round2(after), change: change(after, before) };
}
