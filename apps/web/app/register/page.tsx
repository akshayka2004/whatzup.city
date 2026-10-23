'use client';

import { BrandLogo } from '@/components/common/brand-logo';
import Link from 'next/link';
// mock-db removed — all registration flows through real API
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LegalFooter } from '@/components/common/legal-footer';
import { LaunchOfferBanner } from '@/components/business/launch-offer-banner';
import { CATALOGUE } from '@saas/types';
import { PAYMENTS_ENABLED } from '@/lib/feature-flags';

const cheapestMonthly = Math.min(
  ...CATALOGUE.filter((c) => c.kind === 'BASE').map((c) => c.monthly),
);
import { formatINR } from '@/lib/subscription-plans';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useRegisterWizard } from './_wizard/use-register-wizard';
import { Stepper } from '@/components/system/stepper';
import { StepAccountType } from './_wizard/step-account-type';
import { StepCredentials } from './_wizard/step-credentials';
import { StepProfile } from './_wizard/step-profile';
import { StepPlanPayment } from './_wizard/step-plan-payment';

export default function UnifiedRegisterPage() {
  const w = useRegisterWizard();
  const {
    currentStep,
    role,
    brandCtx,
    outletMode,
    outletError,
    brandLaunchUsed,
    isHotel,
    selectedPlan,
    hotelStarRating,
    hotelAmenities,
    launchOffer,
    launchSlotsLeft,
    categoryLabel,
    claimLaunch,
    resuming,
    STEP_TITLES,
    TOTAL_STEPS,
    error,
    success,
  } = w;

  // Hold the UI until the resume check finishes, otherwise an existing business
  // flashes step 1 before being moved to their real step.
  if (resuming) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center text-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading your registration…</span>
      </div>
    );
  }

  if (outletError) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 text-foreground">
        <Card className="w-full max-w-md p-6 rounded-2xl text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-danger-soft-foreground mx-auto" />
          <h1 className="text-lg font-bold">We couldn&apos;t open this outlet</h1>
          <p className="text-sm text-muted-foreground">{outletError}</p>
          <Button asChild className="h-11 w-full rounded-xl cursor-pointer">
            <Link href="/dashboard/outlets">Back to outlets</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full font-sans flex flex-col">
      {/* Centered content area */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 relative overflow-hidden text-foreground">
        {/* Ambient background decoration */}
        <div
          className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[160px] pointer-events-none"
          style={{ background: 'rgba(113,90,90,0.08)' }}
        />
        <div
          className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] pointer-events-none"
          style={{ background: 'rgba(113,90,90,0.06)' }}
        />

        <div className="w-full max-w-4xl relative z-10 space-y-6">
          {/* Top Header */}
          <div className="text-center space-y-2 mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-muted-foreground text-xs font-semibold tracking-wide">
              <BrandLogo alt="Whtzup.city Logo" className="h-5 w-auto object-contain" />
              <span className="font-semibold tracking-tight">whtzup.city</span>
            </div>
            {outletMode && brandCtx ? (
              <>
                <h1 className="text-foreground text-3xl md:text-4xl font-extrabold tracking-tight">
                  Adding an outlet to {brandCtx.name}
                </h1>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {PAYMENTS_ENABLED
                    ? "Finish this outlet's details and choose its plan. Your brand's invoice details are filled in for you."
                    : "Finish this outlet's details. Your brand's details are filled in for you."}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-foreground text-3xl md:text-4xl font-extrabold tracking-tight">
                  Create Your Account
                </h1>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Complete registration steps to unlock full catalog listings, reviews, and alerts.
                </p>
              </>
            )}
          </div>

          {/* Stepper bar */}
          <div className="w-full rounded-card border border-border bg-card p-4 shadow-e1">
            {/* Display only: earlier steps create the account/draft, so jumping back is done by each step's own Back button. */}
            <Stepper steps={STEP_TITLES} current={currentStep - 1} />

            {/* Persistent cost context — visible from step 1, not just the payment step */}
            {PAYMENTS_ENABLED && role === 'BUSINESS' && (
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">
                  {isHotel ? 'Hotel listing' : 'Business listing'}
                </span>
                {claimLaunch ? (
                  <span className="font-semibold text-success-soft-foreground">
                    Launch Offer · {formatINR(launchOffer.status?.price ?? 2500)} ·{' '}
                    {launchOffer.status?.durationDays ?? 180} days
                  </span>
                ) : (
                  <span className="font-semibold text-foreground">
                    Free to list · paid plans from {formatINR(cheapestMonthly)}/mo
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Launch offer — live slot count. Generic on step 1, per-category once a business account is being created. */}
          {PAYMENTS_ENABLED &&
            launchOffer.enabled &&
            launchOffer.status &&
            !brandLaunchUsed &&
            (currentStep === 1 || role === 'BUSINESS') && (
              <LaunchOfferBanner
                slotsPerCategory={launchOffer.status.slotsPerCategory}
                price={launchOffer.status.price}
                durationDays={launchOffer.status.durationDays}
                bonusDays={launchOffer.status.bonusDays}
                categoryName={role === 'BUSINESS' && currentStep >= 2 ? categoryLabel : null}
                slotsLeft={launchSlotsLeft}
              />
            )}

          {/* Main Alert Banners */}
          {error && (
            <div className="p-4 rounded-xl bg-danger-soft border border-destructive/25 text-danger-soft-foreground text-sm font-medium flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-success-soft border border-success/25 text-success-soft-foreground text-sm font-medium flex items-center gap-3">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Form Card */}
          <Card className="backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-2xl relative overflow-hidden">
            {/* STEP 1: Account Type Selection */}
            {currentStep === 1 && <StepAccountType w={w} />}

            {/* STEP 2: Account Details & Validation */}
            {currentStep === 2 && <StepCredentials w={w} />}

            {/* STEP 3: Kerala Entity Profile Setup & Document Upload */}
            {currentStep === 3 && <StepProfile w={w} />}

            {/* ── STEP 4 (business only): plan / classification, then payment ── */}
            {currentStep === 4 && role === 'BUSINESS' && <StepPlanPayment w={w} />}
          </Card>
        </div>
      </div>

      {/* Footer — dark wrapper so theme vars resolve on the always-dark register page */}
      <div className="dark w-full">
        <LegalFooter />
      </div>
    </div>
  );
}
