'use client';

import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { MoviesManager } from '@/components/admin/movies-manager';

export default function SuperAdminMoviesPage() {
  return (
    <SuperAdminLayout>
      <MoviesManager />
    </SuperAdminLayout>
  );
}
