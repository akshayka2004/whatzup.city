'use client';

import { ReactNode } from 'react';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { AppShell, AppShellSkeleton } from './app-shell';

// Deliberately narrow: only PLATFORM_STAFF (and admin tiers, for oversight)
// pass this gate. Everyone else is denied by default — this role must never
// widen into SuperAdminLayout/AdminLayout's own role lists.
export function StaffLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useRequireAuth(['PLATFORM_STAFF', 'admin', 'super-admin']);
  if (loading || !user) return <AppShellSkeleton />;
  return <AppShell area="staff">{children}</AppShell>;
}
