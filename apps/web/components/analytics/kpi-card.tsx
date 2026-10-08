'use client';

import type { ComponentType } from 'react';
import { ArrowDownRight, ArrowUpRight, Info, Minus } from 'lucide-react';
import { Sparkline } from '@/components/common/sparkline';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Metric } from '@/lib/services/analytics-v2';
import { formatValue, type ValueFormat } from './format';

/** Delta pill. Colour = good/bad (not up/down): `goodWhen="down"` for refunds, churn, etc. */
export function Delta({ change, goodWhen = 'up', className }: { change: number | null; goodWhen?: 'up' | 'down'; className?: string }) {
  if (change == null) {
    return <span className={cn('text-caption text-subtle-foreground', className)}>new</span>;
  }
  const flat = Math.abs(change) < 0.5;
  const up = change > 0;
  const good = goodWhen === 'up' ? up : !up;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-label font-semibold tabular-nums',
        flat ? 'text-muted-foreground' : good ? 'text-delta-up' : 'text-delta-down',
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only">{flat ? 'No change' : up ? 'Up' : 'Down'}</span>
      {flat ? '0%' : `${Math.abs(change) >= 1000 ? '999+' : Math.abs(Math.round(change * 10) / 10)}%`}
    </span>
  );
}

/**
 * Stat tile: label · value · delta vs previous period · optional sparkline.
 * When `onSelect` is given the tile is a toggle that drives the main chart (Plausible-style).
 */
export function KpiCard({
  label,
  metric,
  format = 'number',
  icon: Icon,
  definition,
  spark,
  goodWhen = 'up',
  selected = false,
  onSelect,
  loading = false,
  compact = false,
  className,
}: {
  label: string;
  metric?: Metric;
  format?: ValueFormat;
  icon?: ComponentType<{ className?: string }>;
  /** Exact definition shown in an info popover. */
  definition?: string;
  spark?: number[];
  goodWhen?: 'up' | 'down';
  selected?: boolean;
  onSelect?: () => void;
  loading?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const interactive = !!onSelect;
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-label text-muted-foreground">
          {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
          <span className="truncate">{label}</span>
        </span>
        {definition && (
          <Popover>
            <PopoverTrigger asChild>
              <span
                role="button"
                tabIndex={0}
                aria-label={`How "${label}" is measured`}
                onClick={(e) => e.stopPropagation()}
                className="-m-1 rounded-full p-1 text-subtle-foreground hover:text-foreground"
              >
                <Info className="size-3.5" />
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-64 text-caption text-muted-foreground" onClick={(e) => e.stopPropagation()}>
              {definition}
            </PopoverContent>
          </Popover>
        )}
      </div>

      {loading ? (
        <div className="mt-3 space-y-2">
          <div className="ui-skeleton h-7 w-24" />
          <div className="ui-skeleton h-3.5 w-16" />
        </div>
      ) : (
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className={cn('truncate font-bold tracking-tight tabular-nums text-foreground', compact ? 'text-xl' : 'text-[1.625rem] leading-tight')}>
              {formatValue(metric?.value, format, true)}
            </p>
            {metric && (
              <p className="mt-1 flex items-center gap-1.5">
                <Delta change={metric.change} goodWhen={goodWhen} />
                <span className="whitespace-nowrap text-caption text-subtle-foreground">vs {formatValue(metric.previous, format, true)}</span>
              </p>
            )}
          </div>
          {spark && spark.length > 1 && (
            <Sparkline data={spark} width={56} height={26} className={selected ? 'text-primary' : 'text-chart-axis'} />
          )}
        </div>
      )}
    </>
  );

  const base = cn(
    'relative block w-full rounded-card border bg-card p-4 text-left transition-[border-color,box-shadow,background-color] duration-150 sm:p-5',
    selected ? 'border-primary/50 shadow-e2 ring-1 ring-primary/20' : 'border-border/70 shadow-e1',
    interactive && !selected && 'hover:border-border-strong',
    className,
  );

  return interactive ? (
    <button type="button" aria-pressed={selected} onClick={onSelect} className={base}>
      {selected && <span className="absolute inset-x-5 top-0 h-0.5 rounded-b-full bg-primary" aria-hidden />}
      {body}
    </button>
  ) : (
    <div className={base}>{body}</div>
  );
}
