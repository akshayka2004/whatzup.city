import { GridSkeleton, Skel, PageHeaderSkeleton } from '@/components/common/skeletons';

/** Layout-matched placeholder for Search / Category: header, search bar, chip row, card grid. */
/** `bare` drops the page padding, for use inside a layout that already pads (the Suspense fallback). */
export function SearchPageSkeleton({ hero = false, bare = false }: { hero?: boolean; bare?: boolean }) {
  return (
    <div className={bare ? "space-y-5" : "mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6"}>
      {hero ? (
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-7">
          <div className="flex items-center gap-4">
            <Skel className="h-14 w-14 shrink-0 rounded-2xl" />
            <div className="flex-1 space-y-2.5">
              <Skel className="h-7 w-48 sm:w-64" />
              <Skel className="h-4 w-40" />
            </div>
          </div>
        </div>
      ) : (
        <PageHeaderSkeleton />
      )}
      {!hero && <Skel className="h-12 w-full rounded-xl" />}
      <div className="flex gap-2 overflow-hidden">
        <Skel className="h-11 w-28 shrink-0 rounded-full" />
        <Skel className="h-11 w-28 shrink-0 rounded-full" />
        <Skel className="h-11 w-24 shrink-0 rounded-full" />
        <Skel className="h-11 w-24 shrink-0 rounded-full" />
      </div>
      <GridSkeleton variant="business" count={6} />
    </div>
  );
}
