import { cn } from '@/lib/utils';

export interface Bar {
  label: string;
  value: number;
  /** Shown on hover and read by screen readers. */
  title?: string;
  highlight?: boolean;
}

/**
 * Small bar chart drawn with plain elements: one scale, every bar labelled for assistive tech.
 * Wide data scrolls inside its own box so the page never scrolls sideways.
 */
export function MiniBars({
  bars,
  height = 120,
  emptyText = 'Nothing to show yet.',
  minBarWidth = 30,
  label,
}: {
  bars: Bar[];
  height?: number;
  emptyText?: string;
  minBarWidth?: number;
  label: string;
}) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  if (bars.length === 0 || bars.every((b) => b.value === 0)) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }
  // Show about five labels along the axis, not one per bar.
  const every = Math.max(1, Math.ceil(bars.length / 6));
  return (
    <div className="overflow-x-auto" role="img" aria-label={label}>
      <div
        className="flex items-end gap-1 pt-5"
        style={{ height: height + 40, minWidth: bars.length * minBarWidth }}
      >
        {bars.map((b, i) => (
          <div
            key={i}
            className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
            title={b.title ?? `${b.label}: ${b.value}`}
          >
            <span className="text-xs leading-none tabular-nums text-muted-foreground">
              {b.value || ''}
            </span>
            <div
              className={cn('w-full rounded-t-sm', b.highlight ? 'bg-primary' : 'bg-primary/45')}
              style={{ height: Math.max(b.value ? 3 : 0, (b.value / max) * height) }}
            />
            <span className="h-5 whitespace-nowrap text-xs leading-5 text-muted-foreground">
              {i % every === 0 ? b.label : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
