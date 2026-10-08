'use client';

import { Suspense } from 'react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { PlatformOverview } from '@/components/analytics/platform-overview';

export default function OverviewPage() {
  return (
    <SuperAdminLayout>
      <Suspense fallback={<div className="ui-skeleton h-96 rounded-card" />}>
        <PlatformOverview area="super-admin" />
      </Suspense>
    </SuperAdminLayout>
  );
}
