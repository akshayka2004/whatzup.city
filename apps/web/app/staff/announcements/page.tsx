'use client';

import { StaffLayout } from '@/components/layouts/staff-layout';
import { NoticesManager } from '@/components/admin/notices-manager';

export default function StaffAnnouncementsPage() {
  return (
    <StaffLayout>
      <NoticesManager />
    </StaffLayout>
  );
}
