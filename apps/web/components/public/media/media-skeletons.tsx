import { Skel, SkeletonRegion } from '@/components/common/skeletons';

/** Placeholders that mirror the events / movies / government layouts so nothing jumps when data lands. */

export function MediaFiltersSkeleton({ chips = true, selects = 2 }: { chips?: boolean; selects?: 1 | 2 }) {
  return (
    <div aria-hidden className="space-y-3">
      {chips && (
        <div className="flex gap-2 overflow-hidden">
          {[72, 60, 112, 92].map((w, i) => (
            <Skel key={i} className="h-11 shrink-0 rounded-full sm:h-9" style={{ width: w }} />
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:flex">
        {Array.from({ length: selects }).map((_, i) => (
          <Skel key={i} className="h-11 w-full rounded-xl sm:w-52" />
        ))}
      </div>
    </div>
  );
}

export function EventGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <SkeletonRegion label="Loading events" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
          <Skel className="w-full rounded-none" style={{ aspectRatio: '16 / 9' }} />
          <div className="space-y-2.5 p-4">
            <div className="flex gap-1.5">
              <Skel className="h-5 w-20 rounded-md" />
              <Skel className="h-5 w-14 rounded-md" />
            </div>
            <Skel className="h-5 w-4/5" />
            <Skel className="h-4 w-full" />
            <Skel className="h-4 w-1/2" />
            <Skel className="mt-3 h-11 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </SkeletonRegion>
  );
}

export function MovieGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <SkeletonRegion label="Loading movies" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
          <Skel className="w-full rounded-none" style={{ aspectRatio: '2 / 3' }} />
          <div className="space-y-2 p-3">
            <Skel className="h-4 w-4/5" />
            <Skel className="h-3.5 w-1/2" />
            <Skel className="mt-2 h-11 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </SkeletonRegion>
  );
}

export function NoticeListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <SkeletonRegion label="Loading announcements" className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 pl-5">
          <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-muted" />
          <div className="flex items-start gap-3">
            <Skel className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2.5">
              <Skel className="h-5 w-20 rounded-full" />
              <Skel className="h-5 w-4/5" />
              <Skel className="h-4 w-full" />
              <Skel className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </SkeletonRegion>
  );
}
