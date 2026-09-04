'use client';

import { AdminLayout } from '@/components/layouts/admin-layout';
import { NoticesManager } from '@/components/admin/notices-manager';
import { ActionLog } from '@/components/admin/action-log';

export default function AdminNoticesPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <NoticesManager />
        <ActionLog resource="GOVERNMENT_ANNOUNCEMENT" title="Announcements Action Log" />
      </div>
    </AdminLayout>
  );
}
