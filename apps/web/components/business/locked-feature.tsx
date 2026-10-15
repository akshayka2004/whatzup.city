import Link from 'next/link';
import { BarChart3, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Teaser shown in place of a paid feature (analytics): a softened fake chart behind a short pitch
 * and an upgrade button. Server-component safe (no state, no handlers).
 */
export function LockedFeature({
  title = 'Analytics is not in your plan',
  description = 'See how many people view your listing, claim your offers and walk in. Add analytics to any plan.',
  cta = 'See plans & add-ons',
  href = '/dashboard/subscriptions',
  className,
}: {
  title?: string;
  description?: string;
  cta?: string;
  href?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-card border border-border bg-card p-6 sm:p-10',
        className,
      )}
    >
      {/* Decorative bars only: no real data is rendered or requested. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 bottom-0 top-10 flex items-end gap-3 opacity-40 blur-[2px]"
      >
        {[35, 55, 42, 70, 52, 85, 60, 92, 74, 66].map((h, i) => (
          <div key={i} className="flex-1 rounded-t-lg bg-brand-soft" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="relative mx-auto flex max-w-md flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-soft-foreground">
          <BarChart3 className="h-7 w-7" />
        </div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Lock className="h-4 w-4 text-muted-foreground" /> {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <Link
          href={href}
          className="ui-press mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}
