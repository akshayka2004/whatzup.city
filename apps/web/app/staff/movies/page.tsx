'use client';

import { StaffLayout } from '@/components/layouts/staff-layout';
import { MoviesManager } from '@/components/admin/movies-manager';

export default function StaffMoviesPage() {
  return (
    <StaffLayout>
      <MoviesManager />
    </StaffLayout>
  );
}
