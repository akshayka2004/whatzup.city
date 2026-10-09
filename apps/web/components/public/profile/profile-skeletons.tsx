import { Skel, SkeletonRegion } from '@/components/common/skeletons';

/** Placeholders that mirror the profile layout so nothing jumps when data lands. */

export function HeroBlockSkeleton() {
  return (
    <div>
      <Skel className="aspect-[4/3] w-full rounded-3xl sm:aspect-[5/2]" />
      <div className="-mt-9 px-4 sm:px-6">
        <Skel className="h-[4.5rem] w-[4.5rem] rounded-2xl border-4 border-background sm:h-24 sm:w-24" />
      </div>
      <div className="mt-3 space-y-3">
        <div className="flex gap-2">
          <Skel className="h-6 w-20 rounded-full" />
          <Skel className="h-6 w-32 rounded-full" />
        </div>
        <Skel className="h-8 w-3/4 max-w-md" />
        <Skel className="h-4 w-1/2 max-w-xs" />
        <Skel className="h-4 w-2/5 max-w-xs" />
      </div>
    </div>
  );
}

export function TabsSkeleton() {
  return (
    <div className="mt-5 flex gap-2 border-b border-border pb-3">
      {[64, 72, 56, 76].map((w, i) => (
        <Skel key={i} className="h-9 rounded-full" style={{ width: w }} />
      ))}
    </div>
  );
}

export function OfferListSkeleton({ count = 2 }: { count?: number }) {
  return (
    <SkeletonRegion label="Loading offers" className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2.5 rounded-2xl border border-border bg-card p-4">
          <Skel className="h-6 w-1/2" />
          <Skel className="h-4 w-full" />
          <Skel className="h-4 w-1/3" />
          <Skel className="mt-2 h-11 w-full rounded-xl" />
        </div>
      ))}
    </SkeletonRegion>
  );
}

export function ReviewListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonRegion label="Loading reviews" className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skel className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skel className="h-4 w-1/3" />
            <Skel className="h-3.5 w-1/4" />
            <Skel className="h-4 w-full" />
          </div>
        </div>
      ))}
    </SkeletonRegion>
  );
}

export function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <SkeletonRegion className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-6">
      <Skel className="h-6 w-32" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skel key={i} className="h-4" style={{ width: `${95 - i * 12}%` }} />
      ))}
    </SkeletonRegion>
  );
}

export function RelatedSkeleton() {
  return (
    <SkeletonRegion label="Loading related businesses" className="ui-scroll-x flex gap-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-56 shrink-0 space-y-2 rounded-2xl border border-border bg-card p-3"
        >
          <Skel className="aspect-[16/10] w-full rounded-xl" />
          <Skel className="h-4 w-3/4" />
          <Skel className="h-3.5 w-1/2" />
        </div>
      ))}
    </SkeletonRegion>
  );
}

/** Whole-page placeholder: hero, tab bar and two sections. */
export function ProfileSkeleton() {
  return (
    <SkeletonRegion label="Loading business" className="space-y-6 pb-10">
      <HeroBlockSkeleton />
      <TabsSkeleton />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-6">
          <SectionSkeleton rows={4} />
          <OfferListSkeleton />
        </div>
        <SectionSkeleton rows={5} />
      </div>
    </SkeletonRegion>
  );
}
