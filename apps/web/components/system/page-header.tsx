import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Crumb = { label: string; href?: string };

/**
 * The one page heading for every app screen: optional breadcrumbs / back link,
 * eyebrow, title, one line of description, right-aligned actions and an optional
 * slot under it (tabs, filters, KPI strip). Actions wrap under the title on phones.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  breadcrumbs,
  back,
  actions,
  meta,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  breadcrumbs?: Crumb[];
  back?: { href: string; label?: string };
  actions?: ReactNode;
  /** Small inline items after the title (status pill, count). */
  meta?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-6 flex flex-col gap-4 sm:mb-8', className)}>
      {(breadcrumbs?.length || back) && (
        <nav aria-label="Breadcrumb" className="-mb-1 flex min-w-0 items-center gap-1 text-label text-muted-foreground">
          {back && (
            <Link
              href={back.href}
              className="inline-flex min-h-9 items-center gap-1 rounded-md pr-2 hover:text-foreground"
            >
              <ChevronLeft className="size-4" aria-hidden />
              {back.label ?? 'Back'}
            </Link>
          )}
          {!back &&
            breadcrumbs?.map((c, i) => {
              const last = i === breadcrumbs.length - 1;
              return (
                <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1">
                  {c.href && !last ? (
                    <Link href={c.href} className="truncate hover:text-foreground">
                      {c.label}
                    </Link>
                  ) : (
                    <span className={cn('truncate', last && 'text-foreground')} aria-current={last ? 'page' : undefined}>
                      {c.label}
                    </span>
                  )}
                  {!last && <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden />}
                </span>
              );
            })}
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          {eyebrow && <p className="text-overline text-brand-soft-foreground">{eyebrow}</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="text-title text-foreground">{title}</h1>
            {meta}
          </div>
          {description && <p className="max-w-2xl text-body text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {children}
    </header>
  );
}
