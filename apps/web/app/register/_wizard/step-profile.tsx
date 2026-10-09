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
import {
  RegistrationDetailsForm,
  type RegistrationDetails,
} from '@/components/business/registration-details';
import {
  STAR_OPTIONS,
  HOTEL_AMENITIES,
  computeHotelCharge,
  type HotelAmenities,
} from '@/lib/hotel-pricing';
import {
  AmenityDetailsEditor,
  type AmenityItem,
} from '@/components/business/amenity-details-editor';
import { HOME_CHEF_PLANS, HOME_CHEF_DURATION_DAYS, getHomeChefPlan } from '@/lib/home-chef-pricing';
import { useLaunchOffer } from '@/hooks/use-launch-offer';
import { invalidateActiveBusinessCache } from '@/hooks/use-active-business';
import {
  BillSeriesQuestion,
  type BillSeriesMode,
} from '@/components/business/brand-conversion-prompt';
import { LaunchOfferBanner } from '@/components/business/launch-offer-banner';
import {
  SUBSCRIPTION_PLANS,
  PLAN_DURATION_DAYS,
  HOTEL_DURATION_DAYS,
  getPlan,
  formatINR,
  withTax,
  TAX_PERCENT,
  PAYMENT_QR_SRC,
  PAYMENT_UPI_ID,
  PAYMENT_PAYEE_NAME,
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

export function StepProfile({ w }: { w: Wizard }) {
  const {
    router,
    setCurrentStep,
    role,
    categorySlug,
    brandCtx,
    outletMode,
    description,
    setDescription,
    regDetails,
    setRegDetails,
    tags,
    setTags,
    tagInput,
    setTagInput,
    setDistrict,
    city,
    setCity,
    address,
    setAddress,
    deptType,
    setDeptType,
    certFile,
    setCertFile,
    logoFile,
    setLogoFile,
    govtIdFile,
    setGovtIdFile,
    loading,
    uploadProgress,
    handleStep4Submit,
  } = w;
  return (
    <form onSubmit={handleStep4Submit} className="space-y-6 ui-pop">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          Kerala Regional Profile Setup
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Provide structural details and official documents for your Kerala-based entity.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">City / District</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setDistrict(e.target.value);
              }}
              className="w-full h-11 pl-10 pr-4 border border-input bg-background text-foreground rounded-xl text-sm focus:ring-1 focus:outline-none appearance-none cursor-pointer"
            >
              {KERALA_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}, Kerala
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Full Physical Address</label>
          <Input
            type="text"
            placeholder="e.g. 45/998-A, MG Road, Ernakulam"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="h-11 bg-background border-input text-sm text-foreground rounded-xl"
            required
          />
        </div>

        {role === 'GOVERNMENT' && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Administrative Level Type
            </label>
            <select
              value={deptType}
              onChange={(e) => setDeptType(e.target.value)}
              className="w-full h-11 px-3 border border-input text-muted-foreground rounded-xl text-sm focus:outline-none cursor-pointer"
            >
              <option value="Local">Local Civic Body / Municipality</option>
              <option value="District">District Administration / Collectorate</option>
              <option value="State">Kerala State Department</option>
            </select>
          </div>
        )}

        {/* File Upload Section for COMPANY */}
        {role === 'BUSINESS' && (
          <div className="grid md:grid-cols-2 gap-4 pt-3 border-t border-border">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <FileCheck className="h-4 w-4 text-info-soft-foreground" />
                1. Registration Certificate (PDF/Image)
              </label>
              <div className="p-4 rounded-xl border border-dashed border-input hover:border-border bg-white/[0.01] text-center cursor-pointer relative">
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="h-6 w-6 text-muted-foreground mx-auto mb-1.5" />
                {certFile ? (
                  <p className="text-xs font-semibold text-muted-foreground truncate">
                    {certFile.name}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Click to select registration file (Max 10MB)
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-info-soft-foreground" />
                2. Company Brand Logo (Image)
              </label>
              <div className="p-4 rounded-xl border border-dashed border-input hover:border-border bg-white/[0.01] text-center cursor-pointer relative">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="h-6 w-6 text-muted-foreground mx-auto mb-1.5" />
                {logoFile ? (
                  <p className="text-xs font-semibold text-muted-foreground truncate">
                    {logoFile.name}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Click to select company logo (Max 10MB)
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* File Upload Section for GOVERNMENT */}
        {role === 'GOVERNMENT' && (
          <div className="space-y-2 pt-3 border-t border-border">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <FileCheck className="h-4 w-4 text-warning-soft-foreground" />
              Official ID Proof / Gazette Certificate (PDF/Image)
            </label>
            <div className="p-5 rounded-xl border border-dashed border-input hover:border-border bg-white/[0.01] text-center cursor-pointer relative">
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => setGovtIdFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              {govtIdFile ? (
                <p className="text-xs font-semibold text-warning-soft-foreground truncate">
                  {govtIdFile.name}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Click to select verification authority letter (Max 10MB)
                </p>
              )}
            </div>
          </div>
        )}

        {/* Uploading progress tracker */}
        {uploadProgress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Uploading document files...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-1 bg-background" />
          </div>
        )}
      </div>

      {/* ── Business-only: description, KYC details, search tags ── */}
      {role === 'BUSINESS' && (
        <div className="space-y-6 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">About your business</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What you offer, what makes you different…"
              className="w-full p-3 border border-input bg-background text-foreground rounded-xl text-sm focus:ring-1 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Search tags <span className="text-xs">(help customers find you)</span>
            </label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const t = tagInput.trim();
                    if (t && !tags.includes(t)) setTags([...tags, t]);
                    setTagInput('');
                  }
                }}
                placeholder="e.g. biryani, rooftop — press Enter"
                className="h-11 bg-background border-input text-sm rounded-xl"
              />
              <Button
                type="button"
                onClick={() => {
                  const t = tagInput.trim();
                  if (t && !tags.includes(t)) setTags([...tags, t]);
                  setTagInput('');
                }}
                className="h-11 px-4 rounded-xl bg-muted text-foreground cursor-pointer"
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTags(tags.filter((x) => x !== t))}
                    className="px-3 py-1.5 rounded-full text-xs bg-brand-soft border border-primary/20 text-brand-soft-foreground cursor-pointer"
                  >
                    {t} ✕
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-foreground">Registration details</h3>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
              Company, PAN/GST, contacts and category status. Billing contact is required.
            </p>
            {brandCtx?.mode === 'SHARED' && (
              <p className="mb-3 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Your brand shares one bill series{brandCtx.prefix ? ` (${brandCtx.prefix})` : ''}{' '}
                across all outlets. It is set on the brand, so there is nothing to enter here.
              </p>
            )}
            <RegistrationDetailsForm
              value={regDetails}
              onChange={setRegDetails}
              categorySlug={categorySlug}
              lockBrandName={!!brandCtx}
              hideBillSeries={brandCtx?.mode === 'SHARED'}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-6 border-t border-border">
        <Button
          type="button"
          onClick={() => (outletMode ? router.push('/dashboard/outlets') : setCurrentStep(2))}
          disabled={loading}
          className="h-11 px-5 bg-background border border-input text-muted-foreground rounded-xl cursor-pointer w-full sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="rounded-xl h-11 px-6 font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90 transition w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {role === 'BUSINESS' ? 'Saving...' : 'Submitting...'}
            </>
          ) : (
            <>
              {role === 'BUSINESS' ? 'Continue to Plan & Payment' : 'Submit Application'}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
