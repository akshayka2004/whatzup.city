import Link from 'next/link';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

type Action = { label: string; href?: string; onClick?: () => void };

/**
 * One empty-state for the whole app: soft icon tile, a short headline, one line
 * of help and an optional primary action. Replaces the hand-rolled "No X yet"
 * blocks so empty pages feel intentional and consistent.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondary,
  compact = false,
  className,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: Action;
  secondary?: Action;
  compact?: boolean;
  className?: string;
}) {
  const renderAction = (a: Action, primary: boolean) => {
    const cls = cn(
      'ui-press inline-flex min-h-11 items-center justify-center rounded-control px-5 text-sm font-semibold transition-colors',
      primary
        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
        : 'border border-border bg-card text-foreground hover:bg-secondary',
    );
    return a.href ? (
      <Link href={a.href} className={cls}>
        {a.label}
      </Link>
    ) : (
      <button type="button" onClick={a.onClick} className={cls}>
        {a.label}
      </button>
    );
  };

  return (
    <div
      className={cn(
        'ui-fade-up flex flex-col items-center justify-center text-center rounded-card border border-dashed border-border-strong/70 bg-card/60',
        compact ? 'px-5 py-8' : 'px-6 py-14',
        className,
      )}
    >
      {Icon && (
        <div className="mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-soft-foreground">
            <Icon className="h-7 w-7" />
          </div>
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground sm:text-lg">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {(action || secondary) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {action && renderAction(action, true)}
          {secondary && renderAction(secondary, false)}
        </div>
      )}
    </div>
  );
}
