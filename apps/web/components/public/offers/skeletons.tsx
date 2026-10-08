import { Skel, SkeletonRegion } from '@/components/common/skeletons';
import { cn } from '@/lib/utils';

/** Placeholders for the Offers, Spin it and Saved pages — each mirrors its real card so nothing jumps. */

export function CouponSkeleton({ image = false }: { image?: boolean }) {
  return (
    <div>
      <div className="overflow-hidden rounded-t-2xl border border-b-0 border-border bg-card">
        {image && <Skel className="aspect-video w-full rounded-none" />}
        <div className="space-y-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skel className="h-5 w-3/4" />
              <Skel className="h-4 w-1/2" />
            </div>
            <Skel className="h-12 w-16 shrink-0 rounded-xl" />
          </div>
          <div className="flex gap-1.5">
            <Skel className="h-5 w-16 rounded-full" />
            <Skel className="h-5 w-20 rounded-full" />
          </div>
          <Skel className="h-4 w-full" />
          <Skel className="h-3.5 w-32" />
        </div>
      </div>
      <div className="rounded-b-2xl border border-t-0 border-border bg-card">
        <div className="mx-3 border-t border-dashed border-border" />
        <div className="space-y-2 p-4 pt-3 sm:px-5">
          <Skel className="h-11 w-full rounded-xl" />
          <div className="flex gap-2">
            <Skel className="h-11 flex-1 rounded-xl" />
            <Skel className="h-11 w-11 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CouponGridSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <SkeletonRegion label="Loading offers" className={cn('grid grid-cols-1 gap-4 md:grid-cols-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CouponSkeleton key={i} image={i === 0} />
      ))}
    </SkeletonRegion>
  );
}

export function WheelCardSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <Skel className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skel className="h-4 w-2/3" />
          <Skel className="h-3 w-1/3" />
        </div>
      </div>
      <Skel className="h-4 w-full" />
      <div className="flex gap-1">
        <Skel className="h-5 w-9 rounded-md" />
        <Skel className="h-5 w-9 rounded-md" />
        <Skel className="h-5 w-9 rounded-md" />
      </div>
      <Skel className="h-4 w-24" />
    </div>
  );
}

export function WheelGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <SkeletonRegion label="Loading wheels" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <WheelCardSkeleton key={i} />
      ))}
    </SkeletonRegion>
  );
}

export function TicketSkeleton() {
  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-col items-center space-y-2 p-5">
        <Skel className="h-10 w-10 rounded-full" />
        <Skel className="h-3 w-16" />
        <Skel className="h-9 w-32" />
        <Skel className="h-4 w-40" />
      </div>
      <div className="flex flex-col items-center space-y-2 border-t border-dashed border-border px-5 py-4">
        <Skel className="h-3 w-28" />
        <Skel className="h-7 w-36" />
      </div>
    </div>
  );
}

export function TicketGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonRegion label="Loading vouchers" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <TicketSkeleton key={i} />
      ))}
    </SkeletonRegion>
  );
}

export function SavedCardSkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skel className="h-5 w-2/3" />
          <Skel className="h-4 w-1/3" />
        </div>
        <Skel className="h-5 w-5 rounded-full" />
      </div>
      <Skel className="h-4 w-24" />
      <div className="flex gap-2">
        <Skel className="h-11 flex-1 rounded-xl" />
        <Skel className="h-11 w-11 rounded-xl" />
      </div>
    </div>
  );
}

export function SavedGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <SkeletonRegion label="Loading saved businesses" className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <SavedCardSkeleton key={i} />
      ))}
    </SkeletonRegion>
  );
}

/** Title + subtitle bar used by the three routes' loading.tsx. */
export function PageTitleSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="space-y-2.5">
        <Skel className="h-8 w-48 sm:w-64" />
        <Skel className="h-4 w-64 max-w-full sm:w-96" />
      </div>
      {withAction && <Skel className="h-11 w-28 rounded-xl" />}
    </div>
  );
}

export function ChipRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="mb-4 flex gap-2 overflow-hidden" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <Skel key={i} className="h-11 w-24 shrink-0 rounded-full" />
      ))}
    </div>
  );
}
