import { cn } from '@/lib/utils';

/**
 * Loading placeholders that mirror the real layouts so nothing jumps when data
 * arrives. All shimmer comes from the CSS-only `.ui-skeleton` sweep.
 */

export function Skel({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden className={cn('ui-skeleton', className)} style={style} />;
}

/** Wraps a set of placeholders so assistive tech announces one "loading" instead of every block. */
export function SkeletonRegion({
  children,
  label = 'Loading',
  className,
}: {
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}

export function PageHeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="space-y-2.5">
        <Skel className="h-8 w-48 sm:w-64" />
        <Skel className="h-4 w-64 sm:w-96 max-w-full" />
      </div>
      {withAction && <Skel className="h-11 w-28 rounded-xl" />}
    </div>
  );
}

export function BusinessCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <Skel className="h-36 w-full rounded-xl" />
      <Skel className="h-5 w-3/4" />
      <Skel className="h-4 w-1/2" />
      <div className="flex gap-2 pt-1">
        <Skel className="h-6 w-16 rounded-full" />
        <Skel className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function OfferCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <Skel className="h-32 w-full rounded-none" />
      <div className="p-4 space-y-2.5">
        <Skel className="h-5 w-2/3" />
        <Skel className="h-4 w-full" />
        <Skel className="h-4 w-1/2" />
        <Skel className="mt-3 h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
      <Skel className="h-12 w-12 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skel className="h-4 w-2/3" />
        <Skel className="h-3.5 w-1/3" />
      </div>
      <Skel className="h-8 w-16 rounded-lg" />
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <Skel className="h-9 w-9 rounded-xl" />
      <Skel className="h-3.5 w-24" />
      <Skel className="h-8 w-16" />
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-border bg-card p-4', className)}>
      <Skel className="h-4 w-40 mb-4" />
      <div className="flex h-44 items-end gap-2">
        {[40, 65, 50, 80, 55, 90, 70, 60].map((h, i) => (
          <Skel key={i} className="flex-1 rounded-t-md rounded-b-none" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 space-y-5">
      <Skel className="h-7 w-52 rounded-full" />
      <Skel className="h-10 w-4/5" />
      <Skel className="h-10 w-3/5" />
      <Skel className="h-4 w-full max-w-lg" />
      <Skel className="h-12 w-full max-w-xl rounded-2xl" />
    </div>
  );
}

type GridVariant = 'business' | 'offer' | 'row' | 'stat';

const GRID_ITEM: Record<GridVariant, () => React.JSX.Element> = {
  business: BusinessCardSkeleton,
  offer: OfferCardSkeleton,
  row: ListRowSkeleton,
  stat: StatSkeleton,
};

const GRID_CLASS: Record<GridVariant, string> = {
  business: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
  offer: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
  row: 'space-y-3',
  stat: 'grid grid-cols-2 gap-3 lg:grid-cols-4',
};

export function GridSkeleton({
  variant = 'business',
  count = 6,
  className,
}: {
  variant?: GridVariant;
  count?: number;
  className?: string;
}) {
  const Item = GRID_ITEM[variant];
  return (
    <SkeletonRegion className={cn(GRID_CLASS[variant], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Item key={i} />
      ))}
    </SkeletonRegion>
  );
}

/** A full public-page loading frame: header + grid. */
export function PageSkeleton({
  variant = 'business',
  count = 6,
  withAction = false,
}: {
  variant?: GridVariant;
  count?: number;
  withAction?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <PageHeaderSkeleton withAction={withAction} />
      <GridSkeleton variant={variant} count={count} />
    </div>
  );
}
