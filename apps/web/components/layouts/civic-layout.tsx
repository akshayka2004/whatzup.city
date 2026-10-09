'use client';

import { ReactNode } from 'react';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { AppShell, AppShellSkeleton } from './app-shell';

/** NGO, community and news-forum organisations publish through the shared shell. */
export function CivicLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useRequireAuth([
    'civic',
    'NGO_ADMIN',
    'COMMUNITY_ADMIN',
    'NEWS_FORUM_ADMIN',
    'admin',
    'super-admin',
  ]);
  if (loading || !user) return <AppShellSkeleton />;
  return <AppShell area="civic">{children}</AppShell>;
}

export function GovernmentLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useRequireAuth(['government', 'admin', 'super-admin']);
  if (loading || !user) return <AppShellSkeleton />;
  return <AppShell area="government">{children}</AppShell>;
}
