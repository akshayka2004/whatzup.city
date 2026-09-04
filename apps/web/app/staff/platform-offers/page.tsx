'use client';

import { StaffLayout } from '@/components/layouts/staff-layout';
import { PlatformOffersManager } from '@/components/admin/platform-offers-manager';

export default function StaffPlatformOffersPage() {
  return (
    <StaffLayout>
      <PlatformOffersManager />
    </StaffLayout>
  );
}
