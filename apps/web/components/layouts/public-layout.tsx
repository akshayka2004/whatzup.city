'use client';

import { ReactNode } from 'react';
import { PublicSidebar } from '../sidebar/public-sidebar';
import { Header } from '../common/header';
import { MobileNav } from '../navigation/mobile-nav';
import { useIsMobile } from '@/hooks/use-mobile';

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar - Hidden on mobile */}
      {!isMobile && <PublicSidebar />}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />

        {/* Content — extra bottom padding on mobile so the fixed bottom nav
            never covers the last controls (buttons, forms). */}
        <main className="flex-1 overflow-auto">
          <div className={`container mx-auto px-4 pt-6 ${isMobile ? 'pb-28' : 'pb-6'}`}>{children}</div>
        </main>
      </div>

      {/* Mobile navigation - Visible only on mobile */}
      {isMobile && <MobileNav />}
    </div>
  );
}
