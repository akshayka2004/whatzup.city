'use client';

import { AdminLayout } from '@/components/layouts/admin-layout';
import { NoticesManager } from '@/components/admin/notices-manager';

export default function AdminNoticesPage() {
  return (
    <AdminLayout>
      <NoticesManager />
    </AdminLayout>
  );
}
