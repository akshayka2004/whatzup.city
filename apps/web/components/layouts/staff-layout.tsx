'use client';

import { ReactNode } from 'react';
import { StaffSidebar } from '../sidebar/staff-sidebar';
import { Header } from '../common/header';
import { MobileNav } from '../navigation/mobile-nav';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { Loader2 } from 'lucide-react';

interface StaffLayoutProps {
  children: ReactNode;
}

// Deliberately narrow: only PLATFORM_STAFF (and admin tiers, for oversight)
// pass this gate. Everyone else is denied by default — this role must never
// widen into SuperAdminLayout/AdminLayout's own role lists.
export function StaffLayout({ children }: StaffLayoutProps) {
  const isMobile = useIsMobile();
  const { user, loading } = useRequireAuth(['PLATFORM_STAFF', 'admin', 'super-admin']);

  if (loading || !user) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 text-primary animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Authenticating…</span>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full bg-background">
      {!isMobile && <StaffSidebar />}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className={`container mx-auto px-4 pt-6 ${isMobile ? 'pb-28' : 'pb-6'}`}>{children}</div>
        </main>
      </div>

      {isMobile && <MobileNav />}
    </div>
  );
}
