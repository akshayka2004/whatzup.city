/**
 * Small date helpers shared by the events / movies / government pages.
 *
 * Everything is pinned to India Standard Time (no DST, fixed +05:30 offset) so
 * the server-rendered HTML and the browser's hydrated output are identical no
 * matter which timezone the server or the viewer happens to be in.
 */

const IST_TZ = 'Asia/Kolkata';
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

const dayFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', timeZone: IST_TZ });
const monFmt = new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: IST_TZ });
const fullFmt = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: IST_TZ,
});

export function parseDate(d?: string | null): Date | null {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t;
}

/** "12 Oct 2026" (IST). Empty string for missing / invalid input. */
export function fmtDateIST(d?: string | null): string {
  const t = parseDate(d);
  return t ? fullFmt.format(t) : '';
}

export function dayOf(d?: string | null): string {
  const t = parseDate(d);
  return t ? dayFmt.format(t) : '';
}

export function monthOf(d?: string | null): string {
  const t = parseDate(d);
  return t ? monFmt.format(t) : '';
}

/** Midnight IST at the start of the day containing `ts` (epoch ms). */
export function istDayStart(ts: number): number {
  return Math.floor((ts + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
}

/** 0 = Sunday … 6 = Saturday, in IST. */
export function istWeekday(ts: number): number {
  return new Date(ts + IST_OFFSET_MS).getUTCDay();
}

/** "2h 15m" / "45m". */
export function fmtDuration(minutes?: number | null): string {
  const m = Number(minutes) || 0;
  if (m <= 0) return '';
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r}m`;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export function withProtocol(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`;
}
