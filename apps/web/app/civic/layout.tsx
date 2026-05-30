'use client';

import { ReactNode } from 'react';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { Loader2 } from 'lucide-react';

export default function CivicLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useRequireAuth([
    'civic', 'admin', 'super-admin',
    'NGO_ADMIN', 'COMMUNITY_ADMIN', 'NEWS_FORUM_ADMIN',
    'MASTER_ADMIN', 'SUPER_ADMIN',
  ]);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 text-primary animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Authenticating civic session…</span>
      </div>
    );
  }

  return <>{children}</>;
}
