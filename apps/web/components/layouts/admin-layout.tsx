'use client';

import { ReactNode } from 'react';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { AppShell, AppShellSkeleton } from './app-shell';

export function AdminLayout({ children }: { children: ReactNode }) {
  // Both MASTER_ADMIN and SUPER_ADMIN may access the admin panel; a super-admin keeps their own nav.
  const { user, loading } = useRequireAuth(['admin', 'super-admin', 'MASTER_ADMIN', 'SUPER_ADMIN']);
  if (loading || !user) return <AppShellSkeleton />;
  return (
    <AppShell area="admin" wide>
      {children}
    </AppShell>
  );
}
