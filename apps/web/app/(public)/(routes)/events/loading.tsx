import { PublicLayout } from '@/components/layouts/public-layout';
import { PageHeaderSkeleton } from '@/components/common/skeletons';
import { EventGridSkeleton, MediaFiltersSkeleton } from '@/components/public/media/media-skeletons';

export default function Loading() {
  return (
    <PublicLayout>
      <div className="space-y-5">
        <PageHeaderSkeleton />
        <MediaFiltersSkeleton />
        <EventGridSkeleton />
      </div>
    </PublicLayout>
  );
}
