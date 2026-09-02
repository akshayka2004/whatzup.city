'use client';

import { ReactNode, useEffect, useState } from 'react';
import { PublicSidebar } from '../sidebar/public-sidebar';
import { Header } from '../common/header';
import { MobileNav } from '../navigation/mobile-nav';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/use-auth';
import { OnboardingTour } from '../onboarding/platform-tour';
import { CUSTOMER_TOUR_STEPS, CUSTOMER_MOBILE_TOUR_STEPS } from '@/lib/tour-steps';

const ADMIN_ROLES = ['admin', 'super-admin', 'MASTER_ADMIN', 'SUPER_ADMIN'];

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  // useIsMobile() reports false for one tick before its own effect settles —
  // without this guard the tour can mount/unmount before it ever paints.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isAllowedRole = !!user && !ADMIN_ROLES.includes(user.role) && !ADMIN_ROLES.includes(user.rbacRole || '');
  const showTour = mounted && isAllowedRole;

  return (
    <div className="flex h-dvh w-full bg-background">
      {showTour && (
        isMobile
          ? <OnboardingTour steps={CUSTOMER_MOBILE_TOUR_STEPS} storageKey="onboarding_tour_customer_mobile_v1" />
          : <OnboardingTour steps={CUSTOMER_TOUR_STEPS} storageKey="onboarding_tour_customer_v1" />
      )}
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
