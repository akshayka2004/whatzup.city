import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

/**
 * Dependency-free trend line for KPI tiles (≈1 KB of SVG instead of loading a chart library).
 * Colour comes from `currentColor`, so set it with a text-* token on the element or a parent.
 */
export function Sparkline({
  data,
  width = 96,
  height = 32,
  className,
  fill = true,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
}) {
  const pts = data.filter((n) => Number.isFinite(n));
  if (pts.length < 2) return <div className={cn('shrink-0', className)} style={{ width, height }} aria-hidden />;

  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const pad = 2;
  const x = (i: number) => pad + (i * (width - pad * 2)) / (pts.length - 1);
  const y = (v: number) => height - pad - ((v - min) * (height - pad * 2)) / span;
  const line = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts.length - 1).toFixed(1)} ${height} L${x(0).toFixed(1)} ${height} Z`;
  const id = `spark-${pts.length}-${Math.round(max)}-${Math.round(min)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('shrink-0 overflow-visible', className)}
      aria-hidden
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${id})`} />
        </>
      )}
      <path d={line} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1])} r="2.25" fill="currentColor" />
    </svg>
  );
}

/** "+12%" / "-4%" chip. `invert` flips good/bad colouring for metrics where down is good. */
export function TrendBadge({
  value,
  suffix = '%',
  invert = false,
  className,
}: {
  value: number | null | undefined;
  suffix?: string;
  invert?: boolean;
  className?: string;
}) {
  if (value == null || !Number.isFinite(value)) return null;
  const flat = Math.abs(value) < 0.5;
  const up = value > 0;
  const good = invert ? !up : up;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
        flat ? 'bg-muted text-muted-foreground' : good ? 'bg-success/15 text-success-foreground dark:text-success' : 'bg-danger-soft text-danger-soft-foreground',
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {flat ? '0' : `${up ? '+' : ''}${Math.round(value)}`}
      {suffix}
    </span>
  );
}
