/**
 * India Standard Time helpers. The platform's "day" is the IST calendar day (UTC+5:30, no DST),
 * so every analytics bucket, range and comparison goes through here instead of `toISOString()`
 * (which would split a Kerala evening across two UTC days).
 *
 * Timestamps in the DB are stored as UTC; ranges are half-open [start, end).
 */
export const IST_OFFSET_MS = 330 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' of the IST calendar day containing `d`. */
export function istDateKey(d: Date): string {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** UTC instant of IST midnight that starts the given 'YYYY-MM-DD'. */
export function istDayStart(key: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error(`Invalid date key: ${key}`);
  return new Date(Date.parse(`${key}T00:00:00.000Z`) - IST_OFFSET_MS);
}

export function addDaysKey(key: string, days: number): string {
  return istDateKey(new Date(istDayStart(key).getTime() + days * DAY_MS));
}

export type IstRange = { from: string; to: string; start: Date; end: Date; days: number };

/**
 * Inclusive IST date keys → half-open UTC range. `to` defaults to today (IST),
 * `from` to `to - (days-1)`. Caps the span so one request can't scan years of events.
 */
export function istRange(opts: { from?: string; to?: string; days?: number; now?: Date; maxDays?: number }): IstRange {
  const maxDays = opts.maxDays ?? 400;
  const today = istDateKey(opts.now ?? new Date());
  const to = opts.to && /^\d{4}-\d{2}-\d{2}$/.test(opts.to) ? opts.to : today;
  let from: string;
  if (opts.from && /^\d{4}-\d{2}-\d{2}$/.test(opts.from)) from = opts.from;
  else from = addDaysKey(to, -Math.max(1, Math.min(opts.days ?? 30, maxDays)) + 1);
  if (from > to) from = to;
  const start = istDayStart(from);
  let end = istDayStart(addDaysKey(to, 1));
  let days = Math.round((end.getTime() - start.getTime()) / DAY_MS);
  if (days > maxDays) {
    end = new Date(start.getTime() + maxDays * DAY_MS);
    days = maxDays;
  }
  return { from, to: addDaysKey(istDateKey(start), days - 1), start, end, days };
}

/** The equal-length window immediately before `r` (for "vs previous period"). */
export function previousRange(r: IstRange): IstRange {
  const to = addDaysKey(r.from, -1);
  const from = addDaysKey(r.from, -r.days);
  return istRange({ from, to, maxDays: r.days });
}

/** Every IST day key in the range, oldest first (for zero-filling series). */
export function dayKeys(r: IstRange): string[] {
  const out: string[] = [];
  for (let i = 0; i < r.days; i++) out.push(addDaysKey(r.from, i));
  return out;
}

/** Monday-start week key / month key for a day key, used for week/month granularity. */
export function bucketKey(dayKey: string, granularity: 'day' | 'week' | 'month'): string {
  if (granularity === 'day') return dayKey;
  if (granularity === 'month') return `${dayKey.slice(0, 7)}-01`;
  const dow = new Date(`${dayKey}T00:00:00.000Z`).getUTCDay(); // 0 Sun … 6 Sat
  return addDaysKey(dayKey, -((dow + 6) % 7));
}

/** Percent change with sane handling of zero baselines. null = not comparable. */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
