'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppShell, AppShellSkeleton } from './app-shell';
import { StatusScreen } from './status-screen';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/use-auth';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { onboardingService, universalOnboardingService } from '@/lib/services/onboarding-service';
import { SubscriptionPaywall } from '@/components/business/subscription-paywall';
import { BusinessNudges } from '@/components/business/business-nudges';
import { OutletSwitcher } from '@/components/business/outlet-switcher';
import { OnboardingTour } from '@/components/onboarding/platform-tour';
import { BUSINESS_TOUR_STEPS, BUSINESS_MOBILE_TOUR_STEPS } from '@/lib/tour-steps';
import { apiService } from '@/lib/services/api-service';
import {
  AlertTriangle,
  FileClock,
  XCircle,
  ArrowRight,
  Clock,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Paths allowed even when trial has expired
// /dashboard/outlets stays reachable so a brand owner stuck on one outlet can switch to another.
const TRIAL_ALLOWED_PATHS = ['/dashboard/profile', '/dashboard/support', '/dashboard/subscriptions', '/dashboard/outlets'];
// The invoice for a just-submitted payment must stay reachable even though the
// business itself is still PENDING_VERIFICATION at that point.
const VERIFICATION_ALLOWED_PATHS = ['/dashboard/invoice', '/dashboard/outlets'];

type TrialStatus = 'NOT_STARTED' | 'ACTIVE' | 'EXPIRED' | 'CONVERTED';

interface BusinessLayoutProps {
  children: ReactNode;
}

export function BusinessLayout({ children }: BusinessLayoutProps) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  // Gate: while auth is loading we show a spinner; when loaded with no user,
  // useRequireAuth redirects to /login. Business/staff/specialised entity
  // accounts are all permitted past the gate; admin/super-admin too (they
  // bypass verification check below).
  const { user, loading: authLoading } = useRequireAuth([
    'business', 'admin', 'super-admin', 'government', 'civic',
    'influencer', 'professional', 'event-organizer', 'event_organizer',
    'organization', 'organization_admin', 'business_moderator', 'business_staff',
  ]);

  const [verificationStatus, setVerificationStatus] = useState<string>('APPROVED');
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [trialStatus, setTrialStatus] = useState<TrialStatus>('NOT_STARTED');
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number>(0);
  // useIsMobile() reports false for one tick before its own effect settles —
  // without this guard the tour can mount/unmount before it ever paints.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    async function checkVerification() {
      // Auth still resolving OR redirect in-flight — keep loading state on
      if (authLoading) {
        setLoading(true);
        return;
      }
      if (!user) {
        // useRequireAuth has already triggered the redirect; show spinner
        // until the navigation lands.
        setLoading(true);
        return;
      }

      // Admin or Super Admin are never gated
      if (['admin', 'super-admin', 'MASTER_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        setVerificationStatus('APPROVED');
        setLoading(false);
        return;
      }

      // 1. Business role using businessId
      if (user.role === 'business' && user.businessId) {
        try {
          const res = await onboardingService.getProgress(user.businessId);
          if (res.data) {
            // business.status is authoritative (submit sets PENDING_VERIFICATION
            // on the business, not on the progress row).
            const status =
              (res.data as any).business?.status ||
              res.data.onboardingProgress?.status ||
              'DRAFT';
            setVerificationStatus(status);
            if (status === 'REJECTED') {
              const metadata = (res.data.onboardingProgress as any)?.metadata || {};
              setRejectionReason(metadata.rejectionReason || 'Documents did not meet criteria');
            }
          } else {
            setVerificationStatus('DRAFT');
          }
        } catch (e) {
          console.error('Failed to resolve business verification status:', e);
          setVerificationStatus('DRAFT');
        }

        // Fetch trial status for approved businesses
        try {
          const trialRes = await apiService.get<any>(`/v1/trials/status/${user.businessId}`);
          if (trialRes.data) {
            setTrialStatus(trialRes.data.trialStatus as TrialStatus);
            setTrialDaysRemaining(trialRes.data.daysRemaining ?? 0);
          }
        } catch {
          // Non-fatal — trial check failure doesn't block the layout
        }
      }
      // 2. Specialized entity roles using entity.id
      else if (user.entity?.id) {
        try {
          const res = await universalOnboardingService.getProgress(user.entity.id);
          if (res.data && res.data.onboardingProgress) {
            setVerificationStatus(res.data.onboardingProgress.status);
            if (res.data.onboardingProgress.status === 'REJECTED') {
              const metadata = res.data.onboardingProgress.metadata || {};
              setRejectionReason(metadata.rejectionReason || 'Documents did not meet criteria');
            }
          } else {
            setVerificationStatus('DRAFT');
          }
        } catch (e) {
          console.error('Failed to resolve entity verification status:', e);
          setVerificationStatus('DRAFT');
        }
      } else {
        // Customers/Public users or other roles not requiring verification
        setVerificationStatus('APPROVED');
      }
      setLoading(false);
    }
    checkVerification();
  }, [user, authLoading]);

  const getOnboardingPath = (role: string, entityId: string, entityType?: string) => {
    // Business registration is one continuous flow at /register, which resumes
    // an unfinished draft on its own — no id param, no standalone wizard.
    if (role === 'business') return `/register`;
    const type = entityType || '';
    if (type === 'INFLUENCER') return `/register/influencer?id=${entityId}`;
    if (type === 'PROFESSIONAL') return `/register/professional?id=${entityId}`;
    if (type === 'EVENT_ORGANIZER') return `/register/event-organizer?id=${entityId}`;
    if (type === 'ORGANIZATION') return `/register/ngo?id=${entityId}`;
    if (type === 'GOVERNMENT') return `/register/government?id=${entityId}`;
    return `/register/select-role`;
  };

  // Any non-approved workspace is fully gated — no dashboard page is usable
  // until an admin approves. The gate shows current status + (if rejected)
  // the admin's remark and a resubmit action.
  const GATE_STATUSES = ['DRAFT', 'PENDING_VERIFICATION', 'UNDER_REVIEW', 'REJECTED'];
  const isVerificationAllowedPath = VERIFICATION_ALLOWED_PATHS.some((p) => pathname.startsWith(p));
  const isGated = GATE_STATUSES.includes(verificationStatus) && !isVerificationAllowedPath;

  // Trial expiry: block all paths except the allowed list when trial is EXPIRED
  const trialExpired = trialStatus === 'EXPIRED';
  const isTrialAllowedPath = TRIAL_ALLOWED_PATHS.some((p) => pathname.startsWith(p));
  const showTrialModal = trialExpired && !isTrialAllowedPath && verificationStatus === 'APPROVED';


  if (loading) return <AppShellSkeleton />;

  const activeEntityId = user?.entity?.id || user?.businessId || '';
  const activeEntityType = user?.entity?.type || 'BUSINESS';
  const onboardingPath = getOnboardingPath(user?.role || 'user', activeEntityId, activeEntityType);

  // ── Full-screen verification gate ─────────────────────────────────────────
  // Non-approved workspaces cannot use any dashboard page. Show status + CTA.
  if (isGated) {
    const gate =
      verificationStatus === 'REJECTED'
        ? {
            icon: XCircle,
            tone: 'danger' as const,
            title: 'Application not approved',
            body: 'Review the reason below, update your details and resubmit for verification.',
            cta: 'Resubmit application',
          }
        : verificationStatus === 'PENDING_VERIFICATION' || verificationStatus === 'UNDER_REVIEW'
          ? {
              icon: FileClock,
              tone: 'info' as const,
              title: 'Verification in progress',
              body: 'Our team is reviewing your documents. You will get full access as soon as they are approved.',
              cta: '',
            }
          : {
              icon: AlertTriangle,
              tone: 'warning' as const,
              title: 'Finish setting up',
              body: 'Your workspace is still a draft. Complete onboarding to submit your business for verification.',
              cta: 'Complete setup',
            };
    return (
      <StatusScreen icon={gate.icon} tone={gate.tone} title={gate.title} body={gate.body}>
        {verificationStatus === 'REJECTED' && (
          <div className="rounded-2xl bg-danger-soft p-4 text-left">
            <p className="text-overline text-danger-soft-foreground">Reason</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
              {rejectionReason || 'Documents did not meet criteria.'}
            </p>
          </div>
        )}
        {/* Brand owners can hop to another (live) outlet instead of being locked out. */}
        <div className="flex justify-center empty:hidden">
          <OutletSwitcher />
        </div>
        {gate.cta && (
          <Button size="lg" className="w-full" onClick={() => router.push(onboardingPath)}>
            {gate.cta}
            <ArrowRight />
          </Button>
        )}
      </StatusScreen>
    );
  }

  const isAdminViewer =
    ['admin', 'super-admin'].includes(user?.role || '') ||
    ['MASTER_ADMIN', 'SUPER_ADMIN'].includes((user as any)?.rbacRole || '');
  const showTour = mounted && !isAdminViewer && !showTrialModal;

  const trialBanner =
    trialStatus === 'ACTIVE' && trialDaysRemaining <= 5 ? (
      <div className="flex items-center justify-between gap-3 border-b border-warning/25 bg-warning-soft px-4 py-2.5 text-sm text-warning-soft-foreground sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <Clock className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            <strong className="font-semibold">
              Trial ends in {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''}.
            </strong>{' '}
            <span className="hidden sm:inline">Choose a plan to keep uninterrupted access.</span>
          </span>
        </div>
        <Button size="sm" variant="outline" className="shrink-0" onClick={() => router.push('/dashboard/subscriptions')}>
          View plans <ArrowRight />
        </Button>
      </div>
    ) : null;

  return (
    <AppShell
      area="business"
      banner={trialBanner}
      before={
        showTour &&
        (isMobile ? (
          <OnboardingTour steps={BUSINESS_MOBILE_TOUR_STEPS} storageKey="onboarding_tour_business_mobile_v1" />
        ) : (
          <OnboardingTour steps={BUSINESS_TOUR_STEPS} storageKey="onboarding_tour_business_v1" />
        ))
      }
    >
      {/* Trial expired: non-dismissible, everything except the allowed paths is blocked. */}
      {showTrialModal && (
        <StatusScreen
          overlay
          icon={CreditCard}
          tone="danger"
          title="Your free trial has ended"
          body="Choose a subscription plan to keep using your dashboard. Your listing and data are safe."
        >
          <div className="flex justify-center empty:hidden">
            <OutletSwitcher />
          </div>
          <Button size="lg" className="w-full" onClick={() => router.push('/dashboard/subscriptions')}>
            Choose a plan
          </Button>
        </StatusScreen>
      )}

      {/* Payment is mandatory: approved workspaces without an active paid
          plan get a blocking prompt; those nearing expiry get a reminder.
          Skipped while the trial modal is up so overlays never stack. */}
      {!showTrialModal && verificationStatus === 'APPROVED' && <SubscriptionPaywall />}

      {/* One dismissible nudge per session (menu photos > opening hours > brand account),
          never stacked. Owners only — moderators and staff can't manage these. */}
      <BusinessNudges
        enabled={
          !showTrialModal &&
          verificationStatus === 'APPROVED' &&
          !isAdminViewer &&
          !['business_moderator', 'business_staff'].includes(user?.role || '') &&
          (user?.rbacRole || '') !== 'BUSINESS_MODERATOR'
        }
      />

      {children}
    </AppShell>
  );
}
