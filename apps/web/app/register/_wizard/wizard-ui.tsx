'use client';

import { Children, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Inline message under a field; announced to screen readers when it appears. */
export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (Children.toArray(children).length === 0) return null;
  return (
    <p id={id} role="alert" className="text-xs text-danger-soft-foreground">
      {children}
    </p>
  );
}

/** Quiet helper text under a field ("why we ask"). */
export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

/**
 * Tracks which fields the person has left. A field shows its error only after it was touched
 * (blur) or after a submit attempt, so nobody is told off while still typing.
 */
export function useTouched() {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);
  return {
    touch: (field: string) => setTouched((t) => (t[field] ? t : { ...t, [field]: true })),
    show: (field: string) => attempted || !!touched[field],
    attempt: () => setAttempted(true),
  };
}

/**
 * Primary/secondary buttons of a step. On phones the bar sticks to the bottom of the screen so
 * the thumb never has to hunt for "Continue"; from sm up it is the usual inline row.
 */
export function WizardActions({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between',
        // Phone: pinned, full-bleed inside the card padding.
        'sticky bottom-0 z-20 -mx-6 mt-2 bg-card/95 px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur',
        'md:-mx-8 md:px-8 sm:static sm:z-auto sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:backdrop-blur-none',
      )}
    >
      {children}
    </div>
  );
}

/** A collapsed block for things that can wait until after sign-up. */
export function OptionalSection({
  title,
  hint,
  children,
  defaultOpen = false,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span>
          <span className="block text-sm font-semibold text-foreground">
            {title} <span className="font-normal text-muted-foreground">(optional)</span>
          </span>
          {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {/* Kept mounted so the typed values survive collapsing. */}
      <div className={cn('space-y-4 border-t border-border p-4', !open && 'hidden')}>
        {children}
      </div>
    </div>
  );
}

/** Five-segment strength bar. The rules themselves are listed by the checklist below it. */
export function PasswordMeter({ score }: { score: number }) {
  const label = ['Too weak', 'Too weak', 'Weak', 'Fair', 'Good', 'Strong'][score] ?? '';
  const color = score >= 5 ? 'bg-success' : score >= 3 ? 'bg-warning' : 'bg-destructive';
  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={cn('h-1.5 flex-1 rounded-full', i <= score ? color : 'bg-surface-sunken')}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Password strength: {label}</p>
    </div>
  );
}
