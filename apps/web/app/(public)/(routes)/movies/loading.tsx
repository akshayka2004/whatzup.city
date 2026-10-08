import { PublicLayout } from '@/components/layouts/public-layout';
import { PageHeaderSkeleton } from '@/components/common/skeletons';
import { MediaFiltersSkeleton, MovieGridSkeleton } from '@/components/public/media/media-skeletons';

export default function Loading() {
  return (
    <PublicLayout>
      <div className="space-y-5">
        <PageHeaderSkeleton />
        <MediaFiltersSkeleton chips={false} />
        <MovieGridSkeleton />
      </div>
    </PublicLayout>
  );
}
