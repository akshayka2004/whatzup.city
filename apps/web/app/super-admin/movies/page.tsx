'use client';

import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { MoviesManager } from '@/components/admin/movies-manager';
import { ActionLog } from '@/components/admin/action-log';

export default function SuperAdminMoviesPage() {
  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <MoviesManager />
        <ActionLog resource="MOVIE" title="Movies Action Log" />
      </div>
    </SuperAdminLayout>
  );
}
