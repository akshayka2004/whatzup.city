import { PublicLayout } from '@/components/layouts/public-layout';
import { ChipRowSkeleton, CouponGridSkeleton, PageTitleSkeleton } from '@/components/public/offers/skeletons';

export default function Loading() {
  return (
    <PublicLayout>
      <div>
        <PageTitleSkeleton withAction />
        <ChipRowSkeleton />
        <CouponGridSkeleton count={4} className="mt-1" />
      </div>
    </PublicLayout>
  );
}
