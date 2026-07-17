'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BusinessSidebar } from '../sidebar/business-sidebar';
import { Header } from '../common/header';
import { MobileNav } from '../navigation/mobile-nav';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/use-auth';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { onboardingService, universalOnboardingService } from '@/lib/services/onboarding-service';
import { apiService } from '@/lib/services/api-service';
import {
  AlertTriangle,
  ShieldAlert,
  FileClock,
  XCircle,
  ArrowRight,
  Loader2,
  Clock,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Paths allowed even when trial has expired
const TRIAL_ALLOWED_PATHS = ['/dashboard/profile', '/dashboard/support', '/dashboard/subscriptions'];

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
    if (role === 'business') return `/register/business?id=${entityId}`;
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
  const isGated = GATE_STATUSES.includes(verificationStatus);

  // Trial expiry: block all paths except the allowed list when trial is EXPIRED
  const trialExpired = trialStatus === 'EXPIRED';
  const isTrialAllowedPath = TRIAL_ALLOWED_PATHS.some((p) => pathname.startsWith(p));
  const showTrialModal = trialExpired && !isTrialAllowedPath && verificationStatus === 'APPROVED';

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 text-primary animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Authenticating workspace…</span>
      </div>
    );
  }

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
            tone: 'rose',
            title: 'Onboarding Rejected',
            body:
              'Your registration was not approved. Review the reason below, update your details, and resubmit for verification.',
            cta: 'Resubmit Application',
          }
        : verificationStatus === 'PENDING_VERIFICATION' || verificationStatus === 'UNDER_REVIEW'
        ? {
            icon: FileClock,
            tone: 'cyan',
            title: 'Verification Pending',
            body:
              'Your documents are under review by our moderators. You will get full access once approved. Please check back soon.',
            cta: '',
          }
        : {
            icon: AlertTriangle,
            tone: 'amber',
            title: 'Setup Incomplete',
            body:
              'Your workspace is still in draft. Complete the onboarding wizard to submit your business for verification.',
            cta: 'Complete Setup',
          };
    const GateIcon = gate.icon;
    const toneMap: Record<string, string> = {
      rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
      amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    };
    const btnMap: Record<string, string> = {
      rose: 'bg-rose-600 hover:bg-rose-500',
      amber: 'bg-amber-600 hover:bg-amber-500',
      cyan: 'bg-cyan-600 hover:bg-cyan-500',
    };
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 rounded-3xl border border-white/10 bg-[#0d0d12]/90 shadow-2xl text-center space-y-6">
          <div className={`w-20 h-20 rounded-full border flex items-center justify-center mx-auto ${toneMap[gate.tone]}`}>
            <GateIcon className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">{gate.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{gate.body}</p>
          </div>

          {verificationStatus === 'REJECTED' && (
            <div className="text-left rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-rose-400 mb-1">
                Reason for rejection
              </p>
              <p className="text-sm text-rose-200/90 whitespace-pre-wrap">
                {rejectionReason || 'Documents did not meet criteria.'}
              </p>
            </div>
          )}

          {gate.cta && (
            <Button
              onClick={() => router.push(onboardingPath)}
              className={`w-full h-12 rounded-xl text-white font-bold text-base cursor-pointer ${btnMap[gate.tone]}`}
            >
              {gate.cta}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          <p className="text-[10px] text-muted-foreground/60">
            Questions? Contact{' '}
            <a href="mailto:support@lifeartgroup.in" className="text-primary underline">
              support@lifeartgroup.in
            </a>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background relative overflow-hidden">
      {/* Sidebar - Hidden on mobile */}
      {!isMobile && <BusinessSidebar />}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />

        {/* ── Trial expiry banner (ACTIVE trial, days remaining) ── */}
        {trialStatus === 'ACTIVE' && trialDaysRemaining <= 5 && (
          <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-amber-300 z-40 relative">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-amber-400 animate-pulse" />
              <span>
                <strong>Trial expires in {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''}.</strong>{' '}
                Choose a subscription plan to keep uninterrupted access.
              </span>
            </div>
            <Button
              onClick={() => router.push('/dashboard/subscriptions')}
              className="h-7 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
            >
              View Plans <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-auto relative">
          {/* ── Trial expired: full-screen non-dismissible modal ─────────── */}
          {showTrialModal && (
            <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-xl flex items-center justify-center p-4">
              <div className="w-full max-w-md">
                <Card className="p-8 rounded-3xl border border-white/10 bg-[#0d0d12]/90 shadow-2xl text-center space-y-6">
                  {/* Icon */}
                  <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
                    <CreditCard className="h-8 w-8 text-rose-400" />
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
                      Free Trial Expired
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Your free trial has expired.
                      <br />
                      Please select a subscription plan to continue using the platform.
                    </p>
                  </div>

                  {/* CTA */}
                  <Button
                    onClick={() => router.push('/dashboard/subscriptions')}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold text-base cursor-pointer"
                  >
                    Choose Subscription
                  </Button>

                  <p className="text-[10px] text-muted-foreground/60">
                    Questions? Contact{' '}
                    <a href="mailto:support@lifeartgroup.in" className="text-primary underline">
                      support@lifeartgroup.in
                    </a>
                  </p>
                </Card>
              </div>
            </div>
          )}

          <div
            className={`container mx-auto px-4 pt-6 ${isMobile ? 'pb-28' : 'pb-6'}`}
          >
            {children}
          </div>
        </main>
      </div>

      {/* Mobile navigation - Visible only on mobile */}
      {isMobile && <MobileNav />}
    </div>
  );
}
