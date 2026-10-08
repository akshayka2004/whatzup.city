import { PublicLayout } from '@/components/layouts/public-layout';
import { PageTitleSkeleton, SavedGridSkeleton } from '@/components/public/offers/skeletons';

export default function Loading() {
  return (
    <PublicLayout>
      <div>
        <PageTitleSkeleton withAction />
        <SavedGridSkeleton count={4} />
      </div>
    </PublicLayout>
  );
}
