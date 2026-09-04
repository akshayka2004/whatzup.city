'use client';

import { AdminLayout } from '@/components/layouts/admin-layout';
import { PlatformOffersManager } from '@/components/admin/platform-offers-manager';

export default function AdminPlatformOffersPage() {
  return (
    <AdminLayout>
      <PlatformOffersManager />
    </AdminLayout>
  );
}
