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
import { CATEGORIES } from './shared';
import type { Wizard } from './use-register-wizard';

export function StepCredentials({ w }: { w: Wizard }) {
  const { setCurrentStep, role, name, setName, email, setEmail, phone, setPhone, password, setPassword, showPassword, setShowPassword, companyName, setCompanyName, categorySlug, setCategorySlug, subcategorySlug, setSubcategorySlug, halalStatus, setHalalStatus, referralCode, setReferralCode, accountType, setAccountType, brandNameInput, setBrandNameInput, outletLabel, setOutletLabel, billSeriesMode, setBillSeriesMode, sharedPrefix, setSharedPrefix, acceptedTerms, setAcceptedTerms, acceptedPrivacy, setAcceptedPrivacy, civicOrgType, organizationName, setOrganizationName, loading, success, hasMinLength, hasUppercase, hasLowercase, hasDigit, hasSpecialChar, isPasswordValid, isPhoneValid, isEmailValid, handleStep2Submit } = w;
  return (
      <form onSubmit={handleStep2Submit} className="space-y-6 ui-pop">
        <div>
          <h2 className="text-xl font-bold text-foreground">Setup Credentials</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Fill in primary user and registry details. Fields are validated dynamically.
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {role === 'BUSINESS' ? 'Owner Full Name' : role === 'GOVERNMENT' ? 'Department Official Name' : role === 'NGO_COMMUNITY' ? 'Contact Person Name' : 'Full Name'}
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="e.g. Adarsh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-11 bg-background border-input text-sm text-foreground rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="adarsh@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`pl-10 h-11 bg-background text-sm text-foreground rounded-xl ${
                    email && !isEmailValid ? 'border-destructive/25' : 'border-input'
                  }`}
                  required
                />
              </div>
              {email && !isEmailValid && (
                <p className="text-xs text-danger-soft-foreground">Please enter a valid email format</p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Phone Number (10 Digits)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} // Clean up non-digits
                  maxLength={10}
                  className={`pl-10 h-11 bg-background text-sm text-foreground rounded-xl ${
                    phone && !isPhoneValid ? 'border-destructive/25' : 'border-input'
                  }`}
                  required
                />
              </div>
              {phone && !isPhoneValid && (
                <p className="text-xs text-danger-soft-foreground">Phone must contain exactly 10 digits</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pl-10 pr-10 h-11 bg-background text-sm text-foreground rounded-xl ${
                    password && !isPasswordValid ? 'border-destructive/25' : 'border-input'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-muted-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Password Checker Display */}
          {password && (
            <div className="p-3 bg-muted/40 border border-border rounded-xl text-xs space-y-1">
              <p className="font-semibold text-muted-foreground">Password strength checklist:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                <p className={hasMinLength ? 'text-success-soft-foreground' : 'text-muted-foreground'}>✔ Minimum 8 characters</p>
                <p className={hasUppercase ? 'text-success-soft-foreground' : 'text-muted-foreground'}>✔ At least one uppercase letter</p>
                <p className={hasLowercase ? 'text-success-soft-foreground' : 'text-muted-foreground'}>✔ At least one lowercase letter</p>
                <p className={hasDigit ? 'text-success-soft-foreground' : 'text-muted-foreground'}>✔ At least one number digit</p>
                <p className={hasSpecialChar ? 'text-success-soft-foreground' : 'text-muted-foreground'}>✔ At least one special character</p>
              </div>
            </div>
          )}

          {/* CIVIC Additional Fields */}
          {role === 'NGO_COMMUNITY' && (
            <div className="space-y-4 pt-3 border-t border-border">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {civicOrgType === 'NGO' ? 'NGO Name' : civicOrgType === 'COMMUNITY' ? 'Community Name' : 'Forum / Publication Name'}
                </label>
                <div className="relative">
                  <Heart className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={
                      civicOrgType === 'NGO' ? 'e.g. Kerala Welfare Foundation' :
                      civicOrgType === 'COMMUNITY' ? 'e.g. Trivandrum Residents Forum' :
                      'e.g. Kerala Times Digital'
                    }
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="pl-10 h-11 bg-background border-input text-sm text-foreground rounded-xl"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* BUSINESS Additional Fields */}
          {role === 'BUSINESS' && (
            <div className="space-y-4 pt-3 border-t border-border">
              {/* Single listing, or a brand whose outlets each get their own listing + plan */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">How is your business set up?</label>
                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Account type">
                  {([
                    { v: 'SINGLE', title: 'Single business', desc: 'One location with its own listing.', Icon: Building2 },
                    {
                      v: 'BRAND',
                      title: 'Brand with multiple outlets',
                      desc: 'Several outlets under one brand. Each has its own listing, offers and plan.',
                      Icon: Store,
                    },
                  ] as const).map(({ v, title, desc, Icon }) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={accountType === v}
                      onClick={() => setAccountType(v)}
                      className={`min-h-16 rounded-xl border p-3.5 text-left transition cursor-pointer ui-press ${
                        accountType === v
                          ? 'border-primary bg-primary/10'
                          : 'border-input bg-background hover:bg-muted/40'
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Icon className={`h-4 w-4 shrink-0 ${accountType === v ? 'text-primary' : 'text-muted-foreground'}`} />
                        {title}
                      </span>
                      <span className="mt-1 block text-xs leading-snug text-muted-foreground">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {accountType === 'BRAND' && (
                <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4 ui-fade-up">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Brand name <span className="text-danger-soft-foreground">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Sunrise Cafe"
                      value={brandNameInput}
                      onChange={(e) => setBrandNameInput(e.target.value)}
                      maxLength={255}
                      className="h-11 bg-background border-input text-sm text-foreground rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      This outlet&apos;s label <span className="text-muted-foreground/70">(optional)</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Kozhikode - Mavoor Road"
                      value={outletLabel}
                      onChange={(e) => setOutletLabel(e.target.value)}
                      maxLength={100}
                      className="h-11 bg-background border-input text-sm text-foreground rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">e.g. Kozhikode - Mavoor Road</p>
                  </div>
                  <BillSeriesQuestion
                    mode={billSeriesMode}
                    prefix={sharedPrefix}
                    onModeChange={setBillSeriesMode}
                    onPrefixChange={setSharedPrefix}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Company Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="e.g. Sunrise Cafe Ltd."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="pl-10 h-11 bg-background border-input text-sm text-foreground rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <div className="relative">
                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <select
                      value={categorySlug}
                      onChange={(e) => {
                        setCategorySlug(e.target.value);
                        const cat = CATEGORIES.find((c) => c.slug === e.target.value);
                        setSubcategorySlug(cat?.subcategories?.[0]?.slug || '');
                      }}
                      className="w-full h-11 pl-10 pr-4 border border-input text-muted-foreground rounded-xl text-sm focus:ring-1 focus:outline-none appearance-none cursor-pointer"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.slug} value={cat.slug}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Subcategory</label>
                  <div className="relative">
                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <select
                      value={subcategorySlug}
                      onChange={(e) => setSubcategorySlug(e.target.value)}
                      className="w-full h-11 pl-10 pr-4 border border-input text-muted-foreground rounded-xl text-sm focus:ring-1 focus:outline-none appearance-none cursor-pointer"
                    >
                      {(CATEGORIES.find((c) => c.slug === categorySlug)?.subcategories || []).map((sub) => (
                        <option key={sub.slug} value={sub.slug}>
                          {sub.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Halal / Non-Halal — Food businesses only */}
              {categorySlug === 'food' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Halal Status</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { val: 'HALAL', label: 'Halal' },
                      { val: 'NON_HALAL', label: 'Non-Halal' },
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.val}
                        onClick={() => setHalalStatus(opt.val)}
                        className={`h-11 rounded-xl border text-sm font-medium transition cursor-pointer ${
                          halalStatus === opt.val
                            ? 'bg-brand-soft border-primary/25 text-brand-soft-foreground'
                            : 'bg-background border-input text-muted-foreground hover:bg-muted/40'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Displayed as a tag on your business profile.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Referral Code */}
        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-medium text-muted-foreground">
            Referral Code <span className="text-muted-foreground">(optional)</span>
          </label>
          <div className="relative">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Enter referral code if you have one"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              maxLength={20}
              className="pl-10 h-11 bg-background border-input text-sm text-foreground rounded-xl font-mono tracking-wider"
            />
          </div>
        </div>

        {/* Legal acceptance */}
        <div className="space-y-3 pt-3 border-t border-border">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary cursor-pointer"
              required
            />
            <span className="text-xs text-muted-foreground group-hover:text-muted-foreground transition-colors leading-relaxed">
              I agree to the{' '}
              <Link
                href="/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Terms of Service
              </Link>
              {' '}of Whtzup.city <span className="text-danger-soft-foreground">*</span>
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={acceptedPrivacy}
              onChange={(e) => setAcceptedPrivacy(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary cursor-pointer"
              required
            />
            <span className="text-xs text-muted-foreground group-hover:text-muted-foreground transition-colors leading-relaxed">
              I have read and accept the{' '}
              <Link
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Privacy Policy
              </Link>
              {' '}<span className="text-danger-soft-foreground">*</span>
            </span>
          </label>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            onClick={() => setCurrentStep(1)}
            disabled={loading}
            className="h-11 px-5 bg-background border border-input text-muted-foreground rounded-xl cursor-pointer w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </Button>

          <Button
            type="submit"
            disabled={loading}
            className="rounded-xl h-11 px-6 font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Registering...
              </>
            ) : (
              <>
                Register Account <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
  );
}
