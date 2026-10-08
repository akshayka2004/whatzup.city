'use client';

import { useEffect, type ComponentType, type ReactNode } from 'react';
import { Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** White card used by every profile section. */
export function SectionCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-border bg-card p-4 sm:p-6', className)}>{children}</div>
  );
}

export function SectionHeading({
  icon: Icon,
  title,
  hint,
  className,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)}>
      <h2 className="flex items-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
        {Icon && <Icon className="h-5 w-5 shrink-0 text-primary" />}
        {title}
      </h2>
      {hint && <span className="shrink-0 text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

/** Five stars, filled up to `value` (rounded). */
export function Stars({ value, className }: { value: number; className?: string }) {
  const filled = Math.round(value);
  return (
    <span className={cn('inline-flex gap-0.5', className)} aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          className={cn('h-4 w-4', i < filled ? 'fill-warning text-warning' : 'text-muted-foreground/30')}
        />
      ))}
    </span>
  );
}

/**
 * Overlay used by the claim / bill dialogs. A bottom sheet on phones and a
 * centred card from `sm` up. Escape closes it; a stray backdrop tap does not
 * (so a half-filled bill form is never lost by accident).
 */
export function ModalShell({
  label,
  onClose,
  className,
  children,
}: {
  label: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div
        className={cn(
          'ui-pop relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[90vh] sm:rounded-2xl sm:p-6',
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2 top-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}
