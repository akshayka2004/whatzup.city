'use client';

import { ReactNode } from 'react';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { Loader2 } from 'lucide-react';

export default function GovernmentLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useRequireAuth(['government', 'admin', 'super-admin', 'GOVERNMENT_ADMIN', 'MASTER_ADMIN', 'SUPER_ADMIN']);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 text-primary animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Authenticating government session…</span>
      </div>
    );
  }

  return <>{children}</>;
}
