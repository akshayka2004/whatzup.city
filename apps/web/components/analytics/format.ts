const nf = new Intl.NumberFormat('en-IN');
const nf1 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });

/** 1,23,456 · compact: 1.2L / 3.4Cr / 12.3K (Indian grouping). */
export function formatNumber(v: number | null | undefined, compact = false): string {
  if (v == null || !Number.isFinite(v)) return '—';
  if (!compact) return nf.format(Math.round(v));
  const a = Math.abs(v);
  if (a >= 1e7) return `${nf1.format(v / 1e7)}Cr`;
  if (a >= 1e5) return `${nf1.format(v / 1e5)}L`;
  if (a >= 1e3) return `${nf1.format(v / 1e3)}K`;
  return nf.format(Math.round(v));
}

export function formatINR(v: number | null | undefined, compact = false): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `₹${formatNumber(v, compact)}`;
}

export function formatPct(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${v.toFixed(digits).replace(/\.0$/, '')}%`;
}

export type ValueFormat = 'number' | 'inr' | 'pct';

export function formatValue(
  v: number | null | undefined,
  kind: ValueFormat = 'number',
  compact = false,
) {
  if (kind === 'inr') return formatINR(v, compact);
  if (kind === 'pct') return formatPct(v);
  return formatNumber(v, compact);
}

/** "12 Oct" for day keys, "Oct 2026" for month buckets (keys are IST calendar dates). */
export function formatDateKey(key: string, granularity: 'day' | 'week' | 'month' = 'day'): string {
  const d = new Date(`${key}T00:00:00Z`);
  if (granularity === 'month')
    return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function formatRange(from: string, to: string): string {
  const a = new Date(`${from}T00:00:00Z`);
  const b = new Date(`${to}T00:00:00Z`);
  const sameYear = a.getUTCFullYear() === b.getUTCFullYear();
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', timeZone: 'UTC' };
  return `${a.toLocaleDateString('en-IN', sameYear ? opts : { ...opts, year: 'numeric' })} – ${b.toLocaleDateString('en-IN', { ...opts, year: 'numeric' })}`;
}

/** Today's IST date key in the browser. */
export function todayIst(): string {
  return new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
}
