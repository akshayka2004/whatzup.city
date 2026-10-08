import { GridSkeleton, PageHeaderSkeleton, Skel } from '@/components/common/skeletons';

/** Route-transition placeholder matched to the Nearby layout: header + city select, permission card, card grid. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6">
      <PageHeaderSkeleton withAction />
      <Skel className="h-40 w-full rounded-3xl" />
      <div className="flex gap-2 overflow-hidden">
        <Skel className="h-11 w-28 shrink-0 rounded-full" />
        <Skel className="h-11 w-28 shrink-0 rounded-full" />
        <Skel className="h-11 w-24 shrink-0 rounded-full" />
      </div>
      <GridSkeleton variant="business" count={6} />
    </div>
  );
}
