'use client';

import type { ComponentType, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Toggle pill for quick filters / segment pickers. Selected = ink fill (not brand),
 * so brand colour stays reserved for primary actions.
 */
export function FilterChip({
  selected = false,
  onClick,
  icon: Icon,
  count,
  children,
  removable = false,
  className,
  disabled,
}: {
  selected?: boolean;
  onClick?: () => void;
  icon?: ComponentType<{ className?: string }>;
  count?: number;
  children: ReactNode;
  /** Shows an × and treats the click as "remove" (active-filter summary chips). */
  removable?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={removable ? undefined : selected}
      className={cn(
        'inline-flex min-h-10 shrink-0 select-none items-center gap-1.5 rounded-full border px-3.5 text-label transition-[background-color,border-color,color,transform] duration-150 ease-out-quint active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:active:scale-100',
        selected
          ? 'border-foreground bg-foreground text-background'
          : 'border-border-strong/60 bg-card text-foreground hover:border-border-strong hover:bg-secondary',
        className,
      )}
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      <span className="whitespace-nowrap">{children}</span>
      {typeof count === 'number' && (
        <span
          className={cn(
            'rounded-full px-1.5 text-caption tabular-nums',
            selected ? 'bg-background/20' : 'bg-surface-sunken text-muted-foreground',
          )}
        >
          {count}
        </span>
      )}
      {removable && <X className="size-3.5 shrink-0 opacity-70" aria-label="Remove" />}
    </button>
  );
}

/** Horizontal chip strip: scrolls with snap on phones, wraps on desktop when `wrap`. */
export function ChipRow({
  children,
  wrap = false,
  label,
  className,
}: {
  children: ReactNode;
  wrap?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'flex items-center gap-2',
        wrap ? 'flex-wrap' : 'ui-scroll-x pb-1 sm:mx-0 sm:px-0',
        className,
      )}
    >
      {children}
    </div>
  );
}
