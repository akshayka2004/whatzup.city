'use client';

import { StaffLayout } from '@/components/layouts/staff-layout';
import { BuffetRsvpsManager } from '@/components/admin/buffet-rsvps-manager';

export default function StaffBuffetRsvpsPage() {
  return (
    <StaffLayout>
      <BuffetRsvpsManager />
    </StaffLayout>
  );
}
