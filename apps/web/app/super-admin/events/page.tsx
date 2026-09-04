'use client';

import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { EventsManager } from '@/components/admin/events-manager';
import { ActionLog } from '@/components/admin/action-log';

export default function SuperAdminEventsPage() {
  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <EventsManager />
        <ActionLog resource="EVENT" title="Events Action Log" />
      </div>
    </SuperAdminLayout>
  );
}
