'use client';

import { notFound } from 'next/navigation';
import { StaffLayout } from '@/components/layouts/staff-layout';
import { MoviesManager } from '@/components/admin/movies-manager';
import { MOVIES_ENABLED } from '@/lib/feature-flags';

export default function StaffMoviesPage() {
  if (!MOVIES_ENABLED) notFound();
  return (
    <StaffLayout>
      <MoviesManager />
    </StaffLayout>
  );
}
