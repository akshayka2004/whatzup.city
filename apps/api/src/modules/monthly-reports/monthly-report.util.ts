// Pure helpers for the monthly report: the month window (India time), ranking, masking and CSV.
import { csvRow } from '../../common/utils/csv';

const IST_OFFSET_MS = 5.5 * 3_600_000;

/** "2026-11" or nothing → the month as { key, start, end, label }; end is the first instant of the next month. */
export function monthWindow(input?: string, now = Date.now()) {
  const istNow = new Date(now + IST_OFFSET_MS);
  let year = istNow.getUTCFullYear();
  let month = istNow.getUTCMonth() + 1;
  if (input) {
    const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(input.trim());
    if (!m) return null;
    year = Number(m[1]);
    month = Number(m[2]);
    if (year < 2020 || year > 2100) return null;
  }
  const start = new Date(Date.UTC(year, month - 1, 1) - IST_OFFSET_MS);
  const end = new Date(Date.UTC(year, month, 1) - IST_OFFSET_MS);
  const prevStart = new Date(Date.UTC(year, month - 2, 1) - IST_OFFSET_MS);
  const key = `${year}-${String(month).padStart(2, '0')}`;
  const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const futureStart = start.getTime() > now;
  return {
    key,
    start,
    end,
    prevStart,
    label,
    futureStart,
    days: Math.round((+end - +start) / 86_400_000),
  };
}

/** The calendar day (YYYY-MM-DD, India time) of a moment. */
export const istDayOf = (d: Date) =>
  new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

/** "Asha Nair" → "Asha N." Used where a business owner sees a customer. */
export function maskName(name?: string | null): string {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'Customer';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export type SpendRow = { businessId: string; userId: string; amount: number; bills: number };

/** The single biggest spender for each key (a business id, or a category id). */
export function topSpenderBy(
  rows: SpendRow[],
  keyOf: (r: SpendRow) => string | undefined,
): Map<string, { userId: string; amount: number; bills: number }> {
  // Add up each person's spend per key first (a person can spend at several outlets of one category).
  const sums = new Map<string, Map<string, { amount: number; bills: number }>>();
  for (const r of rows) {
    const key = keyOf(r);
    if (!key) continue;
    const per = sums.get(key) ?? new Map();
    const cur = per.get(r.userId) ?? { amount: 0, bills: 0 };
    cur.amount += r.amount;
    cur.bills += r.bills;
    per.set(r.userId, cur);
    sums.set(key, per);
  }
  const out = new Map<string, { userId: string; amount: number; bills: number }>();
  for (const [key, per] of sums) {
    let best: { userId: string; amount: number; bills: number } | null = null;
    // Ties go to the person with more bills, then the smaller id, so the result never flips between runs.
    for (const [userId, v] of per) {
      if (
        !best ||
        v.amount > best.amount ||
        (v.amount === best.amount &&
          (v.bills > best.bills || (v.bills === best.bills && userId < best.userId)))
      ) {
        best = { userId, ...v };
      }
    }
    if (best) out.set(key, best);
  }
  return out;
}

/** Percent change from `before` to `now`; null when there is nothing to compare with. */
export function pctChange(now: number, before: number): number | null {
  if (!before) return null;
  return Math.round(((now - before) / before) * 1000) / 10;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

type Table = { title: string; head: string[]; rows: unknown[][] };

/** The report as a list of small tables; the CSV is these stacked with a blank line between. */
export function reportTables(r: any): Table[] {
  const t: Table[] = [];
  t.push({
    title: 'Summary',
    head: ['Month', 'Scope'],
    rows: [[r.month.label, r.scope === 'platform' ? 'Whole platform' : 'My businesses']],
  });
  if (r.users) {
    t.push({
      title: 'Users',
      head: ['Measure', 'Count'],
      rows: [
        ['All accounts', r.users.total],
        ['Regular users', r.users.regular],
        ['Active this month (signed in)', r.users.activeThisMonth],
        ...Object.entries(r.users.byRole).map(([k, v]) => [`Role: ${k}`, v]),
      ],
    });
  }
  if (r.newUsers) {
    t.push({
      title: 'New users from the portal',
      head: ['Measure', 'Count'],
      rows: [
        ['Joined this month', r.newUsers.total],
        ['Regular users among them', r.newUsers.regular],
        ['Came through a referral', r.newUsers.referred],
        ['Joined last month', r.newUsers.previousTotal],
      ],
    });
    t.push({
      title: 'New users by day',
      head: ['Day', 'New users'],
      rows: r.newUsers.byDay.map((d: any) => [d.day, d.count]),
    });
  }
  t.push({
    title: 'Hotel / business analytics',
    head: [
      'Business',
      'Category',
      'City',
      'Profile views',
      'Calls',
      'Directions',
      'WhatsApp',
      'Saves',
      'Verified bills',
      'Revenue (INR)',
      'New reviews',
    ],
    rows: r.businesses.map((b: any) => [
      b.name,
      b.category,
      b.city,
      b.views,
      b.calls,
      b.directions,
      b.whatsapp,
      b.saves,
      b.bills,
      b.revenue,
      b.reviews,
    ]),
  });
  t.push({
    title: 'Wishlists and interest',
    head: ['Business', 'Category', 'Saved by (this month)'],
    rows: r.interest.topSaved.map((b: any) => [b.name, b.category, b.saves]),
  });
  t.push({
    title: 'Revenue by category (verified bills)',
    head: ['Category', 'Revenue (INR)', 'Bills', 'Share %', 'Change vs last month %'],
    rows: r.revenueByCategory.map((c: any) => [
      c.category,
      c.revenue,
      c.bills,
      c.share,
      c.change ?? '',
    ]),
  });
  t.push({
    title: 'Highest spender in each business',
    head: ['Business', 'Category', 'Spender', 'Spent (INR)', 'Bills'],
    rows: r.topSpenders.byBusiness.map((s: any) => [
      s.business,
      s.category,
      s.name,
      s.amount,
      s.bills,
    ]),
  });
  t.push({
    title: 'Highest spender in each category',
    head: ['Category', 'Spender', 'Spent (INR)', 'Bills'],
    rows: r.topSpenders.byCategory.map((s: any) => [s.category, s.name, s.amount, s.bills]),
  });
  return t;
}

export function reportCsv(r: any): string {
  const lines: string[] = [];
  for (const table of reportTables(r)) {
    lines.push(csvRow([table.title]));
    lines.push(csvRow(table.head));
    for (const row of table.rows) lines.push(csvRow(row));
    lines.push('');
  }
  return lines.join('\r\n');
}
