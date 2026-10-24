'use client';

import { Suspense } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { PlatformOverview } from '@/components/analytics/platform-overview';
import { useAuth } from '@/hooks/use-auth';
import { canAccess } from '@/lib/access';

export default function OverviewPage() {
  const { user } = useAuth();
  return (
    <AdminLayout>
      {canAccess(user, 'analytics') ? (
        <Suspense fallback={<div className="ui-skeleton h-96 rounded-card" />}>
          <PlatformOverview area="admin" />
        </Suspense>
      ) : (
        <div className="mx-auto max-w-md py-16 text-center">
          <h1 className="text-lg font-bold text-foreground">Welcome, {user?.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick a page from the menu. You can open the areas your account was given access to.
          </p>
        </div>
      )}
    </AdminLayout>
  );
}
