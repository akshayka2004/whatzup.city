'use client';

import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { EventsManager } from '@/components/admin/events-manager';

export default function SuperAdminEventsPage() {
  return (
    <SuperAdminLayout>
      <EventsManager />
    </SuperAdminLayout>
  );
}
