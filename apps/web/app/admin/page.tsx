'use client';

import { Suspense } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { PlatformOverview } from '@/components/analytics/platform-overview';

export default function OverviewPage() {
  return (
    <AdminLayout>
      <Suspense fallback={<div className="ui-skeleton h-96 rounded-card" />}>
        <PlatformOverview area="admin" />
      </Suspense>
    </AdminLayout>
  );
}
