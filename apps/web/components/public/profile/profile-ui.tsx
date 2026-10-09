'use client';

import { type ComponentType, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Star } from 'lucide-react';
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
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        // A stray backdrop tap must not throw away a half-filled bill form.
        onInteractOutside={(e) => e.preventDefault()}
        className={cn('block max-h-[90dvh] overflow-y-auto sm:max-w-lg', className)}
      >
        <DialogTitle className="sr-only">{label}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
