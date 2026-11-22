'use client';

import { AdminLayout } from '@/components/layouts/admin-layout';
import { BuffetRsvpsManager } from '@/components/admin/buffet-rsvps-manager';

export default function AdminBuffetRsvpsPage() {
  return (
    <AdminLayout>
      <BuffetRsvpsManager />
    </AdminLayout>
  );
}
