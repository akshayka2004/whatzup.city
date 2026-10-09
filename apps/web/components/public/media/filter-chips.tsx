'use client';

import { cn } from '@/lib/utils';

export interface ChipOption<T extends string = string> {
  value: T;
  label: string;
}

/**
 * Single-select chip row. Scrolls sideways on narrow screens (`ui-scroll-x`)
 * instead of wrapping into a tall block, with 44px touch targets on mobile.
 */
export function ChipRow<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('ui-scroll-x flex gap-2 pb-1', className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'ui-press inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-colors sm:min-h-9',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-foreground hover:bg-secondary',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
