import { PublicLayout } from '@/components/layouts/public-layout';
import {
  GridSkeleton, HeroSkeleton, PageHeaderSkeleton, Skel, SkeletonRegion,
} from '@/components/common/skeletons';

/** Mirrors the landing page: hero, category row, then a content strip. */
export default function Loading() {
  return (
    <PublicLayout>
      <div className="space-y-8 md:space-y-10">
        <HeroSkeleton />

        <SkeletonRegion label="Loading categories" className="space-y-4">
          <PageHeaderSkeleton />
          <div className="flex gap-3 overflow-hidden md:grid md:grid-cols-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skel key={i} className="h-[104px] w-[92px] shrink-0 rounded-2xl md:h-[68px] md:w-auto" />
            ))}
          </div>
        </SkeletonRegion>

        <div className="space-y-4">
          <PageHeaderSkeleton />
          <GridSkeleton variant="offer" count={3} />
        </div>
      </div>
    </PublicLayout>
  );
}
