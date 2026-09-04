'use client';

import { StaffLayout } from '@/components/layouts/staff-layout';
import { EventsManager } from '@/components/admin/events-manager';

export default function StaffEventsPage() {
  return (
    <StaffLayout>
      <EventsManager />
    </StaffLayout>
  );
}
