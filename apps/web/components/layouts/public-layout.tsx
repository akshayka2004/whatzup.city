'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/use-auth';
import { OnboardingTour } from '../onboarding/platform-tour';
import { CUSTOMER_TOUR_STEPS, CUSTOMER_MOBILE_TOUR_STEPS } from '@/lib/tour-steps';
import { AppShell } from './app-shell';

const ADMIN_ROLES = ['admin', 'super-admin', 'MASTER_ADMIN', 'SUPER_ADMIN'];

export function PublicLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  // useIsMobile() reports false for one tick before its own effect settles —
  // without this guard the tour can mount/unmount before it ever paints.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isAllowedRole = !!user && !ADMIN_ROLES.includes(user.role) && !ADMIN_ROLES.includes(user.rbacRole || '');
  const showTour = mounted && isAllowedRole;

  return (
    <AppShell
      area="public"
      before={
        showTour &&
        (isMobile ? (
          <OnboardingTour steps={CUSTOMER_MOBILE_TOUR_STEPS} storageKey="onboarding_tour_customer_mobile_v1" />
        ) : (
          <OnboardingTour steps={CUSTOMER_TOUR_STEPS} storageKey="onboarding_tour_customer_v1" />
        ))
      }
    >
      {children}
    </AppShell>
  );
}
