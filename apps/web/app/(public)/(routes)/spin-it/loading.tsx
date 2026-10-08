import { PublicLayout } from '@/components/layouts/public-layout';
import { Skel } from '@/components/common/skeletons';
import { WheelGridSkeleton } from '@/components/public/offers/skeletons';

export default function Loading() {
  return (
    <PublicLayout>
      <div>
        <div className="mb-5 rounded-3xl border border-border bg-card p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Skel className="h-12 w-12 shrink-0 rounded-2xl" />
              <div className="space-y-2">
                <Skel className="h-7 w-32" />
                <Skel className="h-4 w-64 max-w-full" />
              </div>
            </div>
            <Skel className="h-[5.5rem] w-full rounded-2xl sm:w-[17rem]" />
          </div>
        </div>
        <div className="mb-5 grid grid-cols-2 gap-2 sm:flex">
          <Skel className="h-11 rounded-xl sm:w-44" />
          <Skel className="h-11 rounded-xl sm:w-44" />
        </div>
        <WheelGridSkeleton />
      </div>
    </PublicLayout>
  );
}
