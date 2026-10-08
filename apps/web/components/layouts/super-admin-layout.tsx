'use client';

import { ReactNode } from 'react';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { AppShell, AppShellSkeleton } from './app-shell';

export function SuperAdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useRequireAuth(['super-admin', 'SUPER_ADMIN']);
  if (loading || !user) return <AppShellSkeleton />;
  return (
    <AppShell area="super-admin" wide>
      {children}
    </AppShell>
  );
}
