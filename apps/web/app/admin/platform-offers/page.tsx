'use client';

import { AdminLayout } from '@/components/layouts/admin-layout';
import { PlatformOffersManager } from '@/components/admin/platform-offers-manager';
import { ActionLog } from '@/components/admin/action-log';

export default function AdminPlatformOffersPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <PlatformOffersManager />
        <ActionLog resource="PLATFORM_OFFER" title="Platform Offers Action Log" />
      </div>
    </AdminLayout>
  );
}
