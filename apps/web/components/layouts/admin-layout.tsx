'use client';

import { ReactNode } from 'react';
import { AdminSidebar } from '../sidebar/admin-sidebar';
import { Header } from '../common/header';
import { MobileNav } from '../navigation/mobile-nav';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { Loader2 } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const isMobile = useIsMobile();
  // Both MASTER_ADMIN and SUPER_ADMIN may access the admin panel
  const { user, loading } = useRequireAuth(['admin', 'super-admin', 'MASTER_ADMIN', 'SUPER_ADMIN']);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 text-primary animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Authenticating…</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background">
      {!isMobile && <AdminSidebar />}

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
