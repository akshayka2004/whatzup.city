'use client';

import { notFound } from 'next/navigation';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { MoviesManager } from '@/components/admin/movies-manager';
import { ActionLog } from '@/components/admin/action-log';
import { MOVIES_ENABLED } from '@/lib/feature-flags';

export default function SuperAdminMoviesPage() {
  if (!MOVIES_ENABLED) notFound();
  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <MoviesManager />
        <ActionLog resource="MOVIE" title="Movies Action Log" />
      </div>
    </SuperAdminLayout>
  );
}
