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
import {
  AlertTriangle,
  ShieldAlert,
  FileClock,
  XCircle,
  ArrowRight,
  Loader2,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
    'business', 'admin', 'super-admin', 'government',
    'influencer', 'professional', 'event-organizer', 'organization',
  ]);

  const [verificationStatus, setVerificationStatus] = useState<string>('APPROVED');
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState<string>('');

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
      if (user.role === 'admin' || user.role === 'super-admin') {
        setVerificationStatus('APPROVED');
        setLoading(false);
        return;
      }

      // 1. Business role using businessId
      if (user.role === 'business' && user.businessId) {
        try {
          const res = await onboardingService.getProgress(user.businessId);
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
          console.error('Failed to resolve business verification status:', e);
          setVerificationStatus('DRAFT');
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

  const isRestrictedPath =
    pathname.includes('/analytics') ||
    pathname.includes('/campaigns') ||
    pathname.includes('/support');

  const showOverlay = verificationStatus !== 'APPROVED' && isRestrictedPath;

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

  return (
    <div className="flex h-screen w-full bg-background relative overflow-hidden">
      {/* Sidebar - Hidden on mobile */}
      {!isMobile && <BusinessSidebar />}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Verification Status Warning Banner */}
        {verificationStatus !== 'APPROVED' && (
          <div className="w-full relative z-50">
            {verificationStatus === 'DRAFT' && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-amber-300">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 animate-pulse" />
                  <span>
                    <strong>Setup Incomplete:</strong> Your workspace is currently in draft
                    mode. Complete the onboarding wizard to list your services.
                  </span>
                </div>
                <Button
                  onClick={() => router.push(onboardingPath)}
                  className="h-7 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  Complete Setup
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            )}

            {verificationStatus === 'PENDING_VERIFICATION' && (
              <div className="bg-cyan-500/10 border-b border-cyan-500/20 px-4 py-2.5 flex items-center gap-2 text-xs text-cyan-300">
                <FileClock className="h-4 w-4 shrink-0 text-cyan-400 animate-pulse" />
                <span>
                  <strong>Verification Pending:</strong> Your official registry documents are
                  currently under review by system moderators. Access is limited.
                </span>
              </div>
            )}

            {verificationStatus === 'REJECTED' && (
              <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-rose-300">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>
                    <strong>Onboarding Rejected:</strong>{' '}
                    {rejectionReason || 'Please review and modify your registration details.'}
                  </span>
                </div>
                <Button
                  onClick={() => router.push(onboardingPath)}
                  className="h-7 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  Modify Details
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        )}

        <Header />

        {/* Content */}
        <main className="flex-1 overflow-auto relative">
          {showOverlay ? (
            // Premium full-page glass overlay
            <div className="absolute inset-0 bg-background/40 backdrop-blur-md z-40 flex items-center justify-center p-6">
              <Card className="max-w-md p-8 bg-[#0d0d12]/80 border border-white/5 shadow-2xl rounded-3xl text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mx-auto">
                  <Lock className="h-6 w-6 text-violet-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-100">Verification Required</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    This sub-panel is restricted. Your account is currently pending administrator
                    approval. Once verified, you will unlock full analytics, marketing campaigns,
                    and partner support.
                  </p>
                </div>
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={() => router.push('/dashboard')}
                    className="bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 rounded-xl px-5 py-2 text-xs font-semibold cursor-pointer"
                  >
                    Return to Dashboard
                  </Button>
                  {(verificationStatus === 'DRAFT' || verificationStatus === 'REJECTED') && (
                    <Button
                      onClick={() => router.push(onboardingPath)}
                      className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-5 py-2 text-xs font-semibold cursor-pointer"
                    >
                      {verificationStatus === 'DRAFT' ? 'Complete Setup' : 'Modify Details'}
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          ) : null}

          <div
            className={`container mx-auto px-4 py-6 ${showOverlay ? 'blur-sm pointer-events-none' : ''}`}
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
