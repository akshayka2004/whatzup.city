import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A titled content block inside a page (settings groups, dashboard panels, detail sections).
 * Header row: optional icon tile, title, one-line description, right-side action.
 */
export function SectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  footer,
  id,
  padded = true,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  id?: string;
  /** false for edge-to-edge content (tables, lists). */
  padded?: boolean;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-28 overflow-hidden rounded-card border border-border/70 bg-card shadow-e1',
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-foreground">
                <Icon className="size-[18px]" />
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="text-heading text-foreground">{title}</h2>}
              {description && (
                <p className="mt-0.5 text-label font-normal text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}
      <div
        className={cn(
          padded ? 'px-5 py-5 sm:px-6' : 'pt-4',
          !title && !action && padded && 'pt-5',
          bodyClassName,
        )}
      >
        {children}
      </div>
      {footer && (
        <div className="flex items-center justify-end gap-2 border-t border-border/70 bg-surface-sunken/50 px-5 py-3 sm:px-6">
          {footer}
        </div>
      )}
    </section>
  );
}
