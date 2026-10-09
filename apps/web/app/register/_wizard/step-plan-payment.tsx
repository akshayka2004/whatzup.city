'use client';

import React, { useState, useEffect } from 'react';
import { BrandLogo } from '@/components/common/brand-logo';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// mock-db removed — all registration flows through real API
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import { KERALA_CITIES } from '@/lib/constants';
import { LegalFooter } from '@/components/common/legal-footer';
import { onboardingService, universalOnboardingService } from '@/lib/services/onboarding-service';
import { authService } from '@/lib/services/auth-service';
import { RegistrationDetailsForm, type RegistrationDetails } from '@/components/business/registration-details';
import {
  STAR_OPTIONS, HOTEL_AMENITIES, computeHotelCharge, type HotelAmenities,
} from '@/lib/hotel-pricing';
import { AmenityDetailsEditor, type AmenityItem } from '@/components/business/amenity-details-editor';
import { HOME_CHEF_PLANS, HOME_CHEF_DURATION_DAYS, getHomeChefPlan } from '@/lib/home-chef-pricing';
import { useLaunchOffer } from '@/hooks/use-launch-offer';
import { invalidateActiveBusinessCache } from '@/hooks/use-active-business';
import { BillSeriesQuestion, type BillSeriesMode } from '@/components/business/brand-conversion-prompt';
import { LaunchOfferBanner } from '@/components/business/launch-offer-banner';
import {
  SUBSCRIPTION_PLANS, PLAN_DURATION_DAYS, HOTEL_DURATION_DAYS, getPlan, formatINR, withTax, TAX_PERCENT,
  PAYMENT_QR_SRC, PAYMENT_UPI_ID, PAYMENT_PAYEE_NAME,
} from '@/lib/subscription-plans';
import {
  User as UserIcon,
  Building2,
  ShieldAlert,
  Mail,
  Phone,
  Key,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  UploadCloud,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  FileCheck,
  MapPin,
  Layers,
  Heart,
  Users,
  Newspaper,
  Store,
} from 'lucide-react';
import type { Wizard } from './use-register-wizard';

export function StepPlanPayment({ w }: { w: Wizard }) {
  const { setCurrentStep, name, email, isHotel, isHomeChef, selectedPlan, setSelectedPlan, homeChefTier, setHomeChefTier, hotelStarRating, setHotelStarRating, hotelAmenities, setHotelAmenities, amenityDetails, setAmenityDetails, launchOffer, launchSlotsLeft, canClaimLaunch, categoryLabel, claimLaunch, setClaimLaunch, showPayment, setShowPayment, paymentProof, setPaymentProof, payerRef, setPayerRef, showInvoice, setShowInvoice, billingName, setBillingName, billingHasGst, setBillingHasGst, billingGstin, setBillingGstin, billingPan, setBillingPan, billingAddress, setBillingAddress, billingPincode, setBillingPincode, invoiceEmail, setInvoiceEmail, address, loading, success, handleBusinessFinalSubmit } = w;
  return (
      <div className="space-y-6 ui-pop">
        {!showPayment ? (
          <>
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Layers className="h-5 w-5 text-muted-foreground" />
                {isHotel ? 'Hotel Classification & Services' : isHomeChef ? 'Choose Your Home Chef Plan' : 'Choose Your Plan'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {isHotel
                  ? 'Select your star classification and the services you offer. Your total is shown on the next screen.'
                  : isHomeChef
                    ? `Exclusive Home Chef pricing. Valid for ${HOME_CHEF_DURATION_DAYS} days (annual).`
                    : `Valid for ${PLAN_DURATION_DAYS} days.`}
              </p>
            </div>

            {canClaimLaunch && (
              <div
                className={`rounded-xl border p-4 ${
                  claimLaunch ? 'border-success/25 bg-success-soft' : 'border-success/25 bg-success-soft'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">Claim launch offer</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ₹{(launchOffer.status?.price ?? 2500).toLocaleString('en-IN')} for 3 months, plus 3 months free and unlimited offers.{' '}
                      <span className="font-semibold text-success-soft-foreground">
                        {launchSlotsLeft} of {launchOffer.status?.slotsPerCategory} slots left in {categoryLabel}
                      </span>
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setClaimLaunch((v) => !v)}
                    variant={claimLaunch ? 'default' : 'outline'}
                    className="rounded-xl h-10 px-5 font-semibold cursor-pointer shrink-0"
                  >
                    {claimLaunch ? 'Launch offer selected' : 'Claim launch offer'}
                  </Button>
                </div>
              </div>
            )}

            {claimLaunch && !isHotel ? (
              <div className="rounded-xl border border-border p-4 space-y-2">
                <p className="text-sm font-bold text-foreground">
                  Launch Offer · {launchOffer.status?.durationDays} days · ₹{(launchOffer.status?.price ?? 2500).toLocaleString('en-IN')}
                </p>
                <ul className="space-y-1">
                  {[
                    'Web App Listing',
                    'Website Listing with backlinks',
                    'Unlimited offers · unlimited vouchers',
                    '3 months paid + 3 months FREE (6 months total)',
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-1 text-xs text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-success-soft-foreground shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  Pay via the QR code on the next screen, same as any other plan.
                </p>
              </div>
            ) : isHotel ? (
              <>
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-2">Star classification</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {STAR_OPTIONS.map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setHotelStarRating(star)}
                        className={`p-3 rounded-xl border text-center transition-all duration-200 ease-out cursor-pointer hover:-translate-y-1 hover:shadow-xl active:scale-[0.98] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 ${
                          hotelStarRating === star
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-border'
                        }`}
                      >
                        <div className="text-sm font-extrabold text-foreground">{star}★</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-foreground mb-2">
                    Services &amp; amenities you offer
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select each service you offer, then add the specific rooms, halls, menus, etc. so guests know what to expect.
                  </p>
                  <AmenityDetailsEditor
                    amenities={hotelAmenities}
                    onAmenitiesChange={setHotelAmenities}
                    details={amenityDetails}
                    onDetailsChange={setAmenityDetails}
                  />
                </div>
              </>
            ) : isHomeChef ? (
              <div className="grid sm:grid-cols-3 gap-3">
                {HOME_CHEF_PLANS.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setHomeChefTier(p.code)}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 ease-out cursor-pointer flex flex-col hover:-translate-y-1 hover:shadow-xl active:scale-[0.98] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 ${
                      homeChefTier === p.code
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-border'
                    }`}
                  >
                    <div className="text-xs font-bold text-primary mb-1">{p.name}</div>
                    <div className="text-lg font-extrabold text-foreground">{formatINR(p.price)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">per year</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {p.offers} offers · {p.vouchers} vouchers
                    </div>
                    <ul className="mt-2 space-y-1">
                      {p.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-1 text-xs text-muted-foreground">
                          <CheckCircle className="h-3 w-3 text-success-soft-foreground shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {SUBSCRIPTION_PLANS.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setSelectedPlan(p.code)}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 ease-out cursor-pointer flex flex-col hover:-translate-y-1 hover:shadow-xl active:scale-[0.98] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 ${
                      selectedPlan === p.code
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-border'
                    }`}
                  >
                    <div className="text-xs font-bold text-primary mb-1">{p.name}</div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-extrabold text-foreground">
                        {formatINR(p.offerPrice)}
                      </span>
                      <span className="text-xs text-muted-foreground line-through">
                        {formatINR(p.mrp)}
                      </span>
                    </div>
                    <div className="text-xs text-success-soft-foreground font-semibold mt-0.5">
                      50% launch offer
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {p.offers} offers · {p.vouchers} vouchers
                    </div>
                    <ul className="mt-2 space-y-1">
                      {p.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-1 text-xs text-muted-foreground">
                          <CheckCircle className="h-3 w-3 text-success-soft-foreground shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-6 border-t border-border">
              <Button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="h-11 px-5 bg-background border border-input text-muted-foreground rounded-xl cursor-pointer w-full sm:w-auto"
              >
                <span className="flex items-center justify-center gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </span>
              </Button>
              <Button
                type="button"
                onClick={() => setShowPayment(true)}
                // Nothing is pre-selected, so require an explicit choice:
                // a star rating for hotels, a tier for Home Chefs, a plan for everyone else
                // (the launch offer stands in for that last choice).
                disabled={isHotel ? !hotelStarRating : claimLaunch ? false : isHomeChef ? !homeChefTier : !selectedPlan}
                className="rounded-xl h-11 px-6 font-semibold flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
              >
                Proceed to Payment <ArrowRight className="h-4 w-4" />
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
                Scan the QR to pay, then upload a screenshot. We verify it and activate your listing.
              </p>
            </div>

            {(() => {
              const charge = computeHotelCharge(hotelStarRating, hotelAmenities);
              const plan = getPlan(selectedPlan);
              const homeChefPlan = getHomeChefPlan(homeChefTier);
              const launchPrice = launchOffer.status?.price ?? 2500;
              // Plan/hotel/Home Chef prices are GST-exclusive; tax is added on top.
              // A launch-offer hotel still pays the flat launch price, not the star/amenity charge.
              const totals = withTax(
                claimLaunch ? launchPrice : isHotel ? charge.total : isHomeChef ? homeChefPlan?.price || 0 : plan?.offerPrice || 0,
              );
              const amount = totals.total;
              const durationDays = claimLaunch
                ? launchOffer.status?.durationDays ?? 180
                : isHotel
                  ? HOTEL_DURATION_DAYS
                  : isHomeChef
                    ? HOME_CHEF_DURATION_DAYS
                    : PLAN_DURATION_DAYS;
              return (
                <div className="rounded-2xl border border-border p-5 space-y-3">
                  <h3 className="text-sm font-bold text-foreground">Your total</h3>
                  {claimLaunch ? (
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Launch Offer{isHotel ? ` · ${hotelStarRating}★ listing` : ''}</span>
                        <span>{formatINR(launchPrice)}</span>
                      </div>
                    </div>
                  ) : isHotel ? (
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>{hotelStarRating}★ classification</span>
                        <span>{formatINR(charge.base)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>
                          {charge.selectedCount} service{charge.selectedCount === 1 ? '' : 's'} × {formatINR(2500)}
                        </span>
                        <span>{formatINR(charge.addons)}</span>
                      </div>
                    </div>
                  ) : isHomeChef ? (
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>{homeChefPlan?.name}</span>
                        <span>{formatINR(homeChefPlan?.price || 0)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>{plan?.name}</span>
                        <span className="line-through text-xs">{formatINR(plan?.mrp || 0)}</span>
                      </div>
                      <div className="flex justify-between text-success-soft-foreground text-xs font-semibold">
                        <span>50% launch offer applied</span>
                        <span>−{formatINR((plan?.mrp || 0) - (plan?.offerPrice || 0))}</span>
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5 border-t border-border pt-3 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatINR(totals.base)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>GST ({TAX_PERCENT}%)</span>
                      <span>{formatINR(totals.tax)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-baseline border-t border-border pt-3">
                    <span className="text-sm font-bold text-foreground">Amount payable</span>
                    <span className="text-2xl font-extrabold text-foreground">{formatINR(amount)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {claimLaunch
                      ? `You pay for 3 months and get 3 more free: valid ${durationDays} days from activation.`
                      : `Valid for ${durationDays} days from activation.`}{' '}
                    Inclusive of {TAX_PERCENT}% GST.
                  </p>
                </div>
              );
            })()}

            <div className="rounded-2xl border border-border p-6 flex flex-col items-center gap-3">
              <h3 className="text-sm font-bold text-foreground">Scan to pay</h3>
              <img
                src={PAYMENT_QR_SRC}
                alt="UPI payment QR code"
                width={340}
                height={340}
                className="w-full max-w-[340px] aspect-square object-contain rounded-xl bg-white p-4"
              />
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Or pay to UPI ID
                </p>
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
                  {[{ l: 'Yes', v: true }, { l: 'No', v: false }].map((o) => (
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
