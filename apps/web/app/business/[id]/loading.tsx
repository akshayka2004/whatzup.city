import { PublicLayout } from '@/components/layouts/public-layout';
import { ProfileSkeleton } from '@/components/public/profile/profile-skeletons';

/** Hero + tabs + first sections, inside the same chrome the real page uses. */
export default function Loading() {
  return (
    <PublicLayout>
      <ProfileSkeleton />
    </PublicLayout>
  );
}
