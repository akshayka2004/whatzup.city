'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { canOpenPath } from '@/lib/access';
import { AppShell, AppShellSkeleton } from './app-shell';
import { NoAccess } from './no-access';

// Deliberately narrow: only PLATFORM_STAFF (and admin tiers, for oversight)
// pass this gate. Everyone else is denied by default — this role must never
// widen into SuperAdminLayout/AdminLayout's own role lists.
export function StaffLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useRequireAuth(['PLATFORM_STAFF', 'admin', 'super-admin']);
  const pathname = usePathname();
  if (loading || !user) return <AppShellSkeleton />;
  return (
    <AppShell area="staff">
      {canOpenPath(user, pathname) ? children : <NoAccess home="/staff" />}
    </AppShell>
  );
}
