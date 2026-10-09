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
import { RegisterRole, CivicOrgType } from './shared';
import type { Wizard } from './use-register-wizard';

export function StepAccountType({ w }: { w: Wizard }) {
  const {
    setCurrentStep,
    role,
    setRole,
    description,
    civicOrgType,
    setCivicOrgType,
    district,
    success,
  } = w;
  return (
    <div className="space-y-6 ui-pop">
      <div className="text-center md:text-left">
        <h2 className="text-xl font-bold text-foreground">Select Account Class</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Choose how you plan to use Whtzup.city. Select from standard roles:
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ui-fade-up">
        {[
          {
            type: 'CUSTOMER',
            title: 'Customer',
            description:
              'Explore verified business catalogs, post public ratings, claim offer coupons.',
            icon: UserIcon,
            color: 'from-primary/15 to-primary/5 hover:border-border',
            iconColor: 'text-brand-soft-foreground',
          },
          {
            type: 'BUSINESS',
            title: 'Company / Business',
            description:
              'Register Kerala-based companies. Upload certificates, manage listings & campaigns.',
            icon: Building2,
            color: 'from-info/15 to-info/5 hover:border-info/25',
            iconColor: 'text-info-soft-foreground',
          },
          {
            type: 'GOVERNMENT',
            title: 'Govt Body',
            description:
              'Publish administrative alerts, notices, and manage district announcements.',
            icon: ShieldAlert,
            color: 'from-warning/15 to-warning/5 hover:border-warning/30',
            iconColor: 'text-warning-soft-foreground',
          },
          {
            type: 'NGO_COMMUNITY',
            title: 'NGO / Community',
            description:
              'Register NGOs, community groups, and news forums. Publish notices and alerts.',
            icon: Heart,
            color: 'from-destructive/15 to-destructive/5 hover:border-destructive/25',
            iconColor: 'text-danger-soft-foreground',
          },
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = role === item.type;
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => setRole(item.type as RegisterRole)}
              className={`p-4 sm:p-5 rounded-2xl border text-left bg-gradient-to-b ${item.color} transition cursor-pointer flex flex-col gap-3 relative ${
                isSelected ? 'border-white scale-[1.02] shadow-xl' : 'border-border'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="p-2.5 rounded-xl bg-background">
                  <Icon className={`h-5 w-5 ${item.iconColor}`} />
                </div>
                {isSelected && (
                  <span className="p-1 rounded-full bg-success-soft border border-success/25 text-success-soft-foreground">
                    <CheckCircle className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-1 text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Civic org sub-type selector */}
      {role === 'NGO_COMMUNITY' && (
        <div className="p-4 rounded-xl bg-danger-soft border border-destructive/25 space-y-3">
          <p className="text-xs font-semibold text-danger-soft-foreground">
            Select Organisation Type
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'NGO', label: 'NGO', icon: Heart, desc: 'Non-Governmental' },
              { value: 'COMMUNITY', label: 'Community', icon: Users, desc: 'Community Group' },
              { value: 'NEWS_FORUM', label: 'News Forum', icon: Newspaper, desc: 'Media / Press' },
            ].map(({ value, label, icon: OIcon, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setCivicOrgType(value as CivicOrgType)}
                className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 cursor-pointer transition ${
                  civicOrgType === value
                    ? 'border-destructive/25 bg-danger-soft text-danger-soft-foreground'
                    : 'border-border text-muted-foreground hover:border-destructive/25'
                }`}
              >
                <OIcon className="h-4 w-4" />
                <span className="text-xs font-semibold">{label}</span>
                <span className="text-xs opacity-60">{desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-4 border-t border-border">
        <Link
          href="/login"
          className="text-muted-foreground hover:text-foreground text-sm font-semibold flex items-center justify-center sm:justify-start gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </Link>

        <Button
          onClick={() => setCurrentStep(2)}
          className="rounded-xl h-11 px-6 font-semibold hover:opacity-90 transition-opacity w-full sm:w-auto"
        >
          Continue <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
