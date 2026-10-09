import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { formatValue, type ValueFormat } from './format';

/** Ranked list with inline magnitude bars (Tremor/Plausible style). Text stays in ink, the bar carries magnitude. */
export function BarList({
  items,
  format = 'number',
  emptyLabel = 'No data in this period',
  max: maxOverride,
  className,
}: {
  items: { key: string; label: ReactNode; value: number; hint?: ReactNode }[];
  format?: ValueFormat;
  emptyLabel?: string;
  max?: number;
  className?: string;
}) {
  if (!items.length)
    return <p className="py-6 text-center text-caption text-muted-foreground">{emptyLabel}</p>;
  const max = maxOverride ?? Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className={cn('space-y-1.5', className)}>
      {items.map((it) => (
        <li
          key={it.key}
          className="relative flex h-9 items-center justify-between gap-3 overflow-hidden rounded-md px-2.5"
        >
          <span
            className="absolute inset-y-0 left-0 rounded-md bg-brand-soft"
            style={{ width: it.value > 0 ? `${Math.max(2, (it.value / max) * 100)}%` : 0 }}
            aria-hidden
          />
          <span className="relative min-w-0 truncate text-sm text-foreground">
            {it.label}
            {it.hint && (
              <span className="ml-1.5 text-caption text-muted-foreground">{it.hint}</span>
            )}
          </span>
          <span className="relative shrink-0 text-sm font-semibold tabular-nums text-foreground">
            {formatValue(it.value, format)}
          </span>
        </li>
      ))}
    </ul>
  );
}
