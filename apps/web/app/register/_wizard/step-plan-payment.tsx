'use client';

import React from 'react';
import {
  Loader2,
  UploadCloud,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  FileCheck,
  Layers,
  Star,
} from 'lucide-react';
import { FREE_ENTITLEMENTS } from '@saas/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { STAR_OPTIONS } from '@/lib/hotel-pricing';
import { AmenityDetailsEditor } from '@/components/business/amenity-details-editor';
import { PAYMENT_QR_SRC, PAYMENT_UPI_ID, PAYMENT_PAYEE_NAME } from '@/lib/subscription-plans';
import { cn } from '@/lib/utils';
import { PAYMENTS_ENABLED } from '@/lib/feature-flags';
import { OrderSummary, UpgradePanel } from './upgrade-panel';
import type { Wizard } from './use-register-wizard';

/** What a Free listing includes, straight from the shared entitlements. */
const FREE_FEATURES = [
  'Your business listing, visible on whtzup.city',
  `${FREE_ENTITLEMENTS.offers} live offer at a time`,
  'Reviewed and approved by our team',
  'Upgrade any time from your dashboard',
];

export function StepPlanPayment({ w }: { w: Wizard }) {
  const {
    setCurrentStep,
    isHotel,
    hotelStarRating,
    setHotelStarRating,
    hotelAmenities,
    setHotelAmenities,
    amenityDetails,
    setAmenityDetails,
    hotelProfileReady,
    claimLaunch,
    handleContinueFree,
    showPayment,
    setShowPayment,
    paymentProof,
    setPaymentProof,
    payerRef,
    setPayerRef,
    showInvoice,
    setShowInvoice,
    billingName,
    setBillingName,
    billingHasGst,
    setBillingHasGst,
    billingGstin,
    setBillingGstin,
    billingPan,
    setBillingPan,
    billingAddress,
    setBillingAddress,
    billingPincode,
    setBillingPincode,
    invoiceEmail,
    setInvoiceEmail,
    loading,
    handleBusinessFinalSubmit,
  } = w;
  return (
    <div className="space-y-6 ui-pop">
      {!showPayment ? (
        <>
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-muted-foreground" />
              {PAYMENTS_ENABLED ? 'Choose how to start' : 'Hotel details'}
            </h2>
            {PAYMENTS_ENABLED ? (
              <p className="text-xs text-muted-foreground mt-1">
                Every business gets a free listing. No payment is needed to register. Upgrade now or
                whenever you are ready.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                One last step. Tell guests what to expect, then submit your listing for review.
              </p>
            )}
          </div>

          {isHotel && (
            <section className="space-y-4 rounded-2xl border border-border p-4 sm:p-5">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Star className="h-4 w-4 text-warning-soft-foreground" />
                  Hotel classification &amp; services
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Shown on your listing so guests know what to expect.
                  {PAYMENTS_ENABLED
                    ? ' This is profile information and does not change what you pay.'
                    : ''}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Star classification <span className="text-danger-soft-foreground">*</span>
                </h4>
                <div className="grid grid-cols-5 gap-2">
                  {STAR_OPTIONS.map((star) => (
                    <button
                      key={star}
                      type="button"
                      aria-pressed={hotelStarRating === star}
                      onClick={() => setHotelStarRating(star)}
                      className={cn(
                        'ui-press min-h-11 rounded-xl border text-center text-sm font-extrabold text-foreground cursor-pointer transition-colors',
                        hotelStarRating === star
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-muted/40',
                      )}
                    >
                      {star}★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Services &amp; amenities you offer
                </h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Select each service you offer, then add the specific rooms, halls, menus, etc.
                </p>
                <AmenityDetailsEditor
                  amenities={hotelAmenities}
                  onAmenitiesChange={setHotelAmenities}
                  details={amenityDetails}
                  onDetailsChange={setAmenityDetails}
                />
              </div>
            </section>
          )}

          {/* Primary path: Free. No payment, straight to verification. */}
          {!PAYMENTS_ENABLED && (
            <section className="space-y-3">
              <Button
                type="button"
                onClick={handleContinueFree}
                disabled={loading || !hotelProfileReady}
                className="rounded-xl h-12 px-6 font-semibold flex items-center justify-center gap-2 cursor-pointer w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    Submit for review <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              {!hotelProfileReady && (
                <p className="text-xs text-muted-foreground">
                  Choose your hotel star classification above to continue.
                </p>
              )}
            </section>
          )}
          {PAYMENTS_ENABLED && (
            <section className="space-y-4 rounded-2xl border-2 border-primary bg-primary/5 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-extrabold text-foreground">Continue with Free</h3>
                <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success-soft-foreground">
                  No payment needed
                </span>
              </div>
              <ul className="space-y-1.5">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-success-soft-foreground shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                onClick={handleContinueFree}
                disabled={loading || !hotelProfileReady}
                className="rounded-xl h-12 px-6 font-semibold flex items-center justify-center gap-2 cursor-pointer w-full"
              >
                {loading && !claimLaunch ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    Continue with Free <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              {!hotelProfileReady && (
                <p className="text-xs text-muted-foreground">
                  Choose your hotel star classification above to continue.
                </p>
              )}
            </section>
          )}

          {PAYMENTS_ENABLED && <UpgradePanel w={w} />}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-6 border-t border-border">
            <Button
              type="button"
              onClick={() => setCurrentStep(3)}
              disabled={loading}
              className="h-11 px-5 bg-background border border-input text-muted-foreground rounded-xl cursor-pointer w-full sm:w-auto"
            >
              <span className="flex items-center justify-center gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Back
              </span>
            </Button>
          </div>
        </>
      ) : !showInvoice ? (
        <>
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-success-soft-foreground" />
              Payment
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Scan the QR to pay, then upload a screenshot. We verify it and activate your upgrade.
              Your listing is submitted for approval either way.
            </p>
          </div>

          <OrderSummary w={w} />

          <div className="rounded-2xl border border-border p-6 flex flex-col items-center gap-3">
            <h3 className="text-sm font-bold text-foreground">Scan to pay</h3>
            {/* eslint-disable-next-line @next/next/no-img-element -- payment QR must stay pixel-exact, no lossy re-encode */}
            <img
              src={PAYMENT_QR_SRC}
              alt="UPI payment QR code"
              width={340}
              height={340}
              className="w-full max-w-[340px] aspect-square object-contain rounded-xl bg-white p-4"
            />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Or pay to UPI ID</p>
              <p className="text-sm font-bold text-foreground tracking-wide select-all">
                {PAYMENT_UPI_ID}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {PAYMENT_PAYEE_NAME} · pay the exact amount shown above
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground">
              Payment screenshot <span className="text-destructive">*</span>
            </label>
            <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-dashed border-input cursor-pointer hover:bg-muted/40 transition">
              <UploadCloud className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {paymentProof ? paymentProof.name : 'Click to upload your payment screenshot'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
              />
            </label>
            <Input
              value={payerRef}
              onChange={(e) => setPayerRef(e.target.value)}
              placeholder="UPI transaction reference (optional)"
              className="h-11 bg-background border-input text-sm rounded-xl"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-6 border-t border-border">
            <Button
              type="button"
              onClick={() => setShowPayment(false)}
              className="h-11 px-5 bg-background border border-input text-muted-foreground rounded-xl cursor-pointer w-full sm:w-auto"
            >
              <span className="flex items-center justify-center gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Back
              </span>
            </Button>
            <Button
              type="button"
              onClick={() => setShowInvoice(true)}
              disabled={loading || !paymentProof}
              className="rounded-xl h-11 px-6 font-semibold flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
            >
              Continue to Invoice Details <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      ) : null}

      {/* Invoice details — our office raises the invoice off-platform,
            so we only collect what's needed to produce it. */}
      {showPayment && showInvoice && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-success-soft-foreground" />
              Invoice Details
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Used to raise your GST invoice. Please make sure these are accurate.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Billing name <span className="text-danger-soft-foreground">*</span>
              </label>
              <Input
                value={billingName}
                onChange={(e) => setBillingName(e.target.value)}
                placeholder="Registered name for the invoice"
                className="h-11 bg-background border-input text-sm rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Do you have GST? <span className="text-danger-soft-foreground">*</span>
              </label>
              <div className="inline-flex rounded-xl border border-input p-0.5">
                {[
                  { l: 'Yes', v: true },
                  { l: 'No', v: false },
                ].map((o) => (
                  <button
                    key={o.l}
                    type="button"
                    onClick={() => setBillingHasGst(o.v)}
                    className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors cursor-pointer ${
                      billingHasGst === o.v
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            {billingHasGst && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  GSTIN <span className="text-danger-soft-foreground">*</span>
                </label>
                <Input
                  value={billingGstin}
                  onChange={(e) => setBillingGstin(e.target.value.toUpperCase())}
                  placeholder="32ABCDE1234F1Z5"
                  maxLength={15}
                  className="h-11 bg-background border-input text-sm rounded-xl"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">PAN</label>
              <Input
                value={billingPan}
                onChange={(e) => setBillingPan(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                maxLength={10}
                className="h-11 bg-background border-input text-sm rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Billing address <span className="text-danger-soft-foreground">*</span>
              </label>
              <textarea
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                rows={3}
                placeholder="Full billing address"
                className="w-full p-3 border border-input bg-background text-foreground rounded-xl text-sm focus:ring-1 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Pincode <span className="text-danger-soft-foreground">*</span>
              </label>
              <Input
                value={billingPincode}
                onChange={(e) => setBillingPincode(e.target.value.replace(/\D/g, ''))}
                placeholder="695001"
                maxLength={6}
                inputMode="numeric"
                className="h-11 bg-background border-input text-sm rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Email for invoice <span className="text-danger-soft-foreground">*</span>
              </label>
              <Input
                type="email"
                value={invoiceEmail}
                onChange={(e) => setInvoiceEmail(e.target.value)}
                placeholder="accounts@yourcompany.com"
                className="h-11 bg-background border-input text-sm rounded-xl"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-6 border-t border-border">
            <Button
              type="button"
              onClick={() => setShowInvoice(false)}
              className="h-11 px-5 bg-background border border-input text-muted-foreground rounded-xl cursor-pointer w-full sm:w-auto"
            >
              <span className="flex items-center justify-center gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Back
              </span>
            </Button>
            <Button
              type="button"
              onClick={handleBusinessFinalSubmit}
              disabled={
                loading ||
                !billingName.trim() ||
                billingHasGst === null ||
                (billingHasGst && !billingGstin.trim()) ||
                !billingAddress.trim() ||
                billingPincode.trim().length !== 6 ||
                !invoiceEmail.trim()
              }
              className="rounded-xl h-11 px-6 font-semibold flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  Submit Payment &amp; Application <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
