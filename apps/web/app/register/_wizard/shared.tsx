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

/* Module-level constants and helpers for the registration wizard. */

export type RegisterRole = 'CUSTOMER' | 'BUSINESS' | 'GOVERNMENT' | 'NGO_COMMUNITY';
export type CivicOrgType = 'NGO' | 'COMMUNITY' | 'NEWS_FORUM';

export const KERALA_DISTRICTS = [
  'Thiruvananthapuram',
  'Kollam',
  'Pathanamthitta',
  'Alappuzha',
  'Kottayam',
  'Idukki',
  'Ernakulam',
  'Thrissur',
  'Palakkad',
  'Malappuram',
  'Kozhikode',
  'Wayanad',
  'Kannur',
  'Kasaragod',
];

export const CATEGORIES = [
  {
    slug: 'food',
    label: 'Food',
    subcategories: [
      { slug: 'restaurants', label: 'Restaurants' },
      { slug: 'home_chefs', label: 'Home Chefs' },
      { slug: 'mess', label: 'Mess' },
      { slug: 'street_food', label: 'Street Food' },
      { slug: 'catering', label: 'Catering' },
      { slug: 'quick_eats', label: 'Quick Eats' },
      { slug: 'fast_food_chains', label: 'Fast-food Chains' },
      { slug: 'home_bakes', label: 'Home Bakes' },
      { slug: 'cafe', label: 'Cafe' },
    ],
  },
  {
    slug: 'fashion',
    label: 'Fashion',
    subcategories: [
      { slug: 'boutiques', label: 'Boutiques' },
      { slug: 'retail_outlets', label: 'Retail Outlets' },
      { slug: 'stitching_centers', label: 'Stitching Centers' },
      { slug: 'dry_cleaning', label: 'Dry Cleaning' },
      { slug: 'shops', label: 'Shops' },
    ],
  },
  {
    slug: 'hotel',
    label: 'Hotel',
    subcategories: [
      { slug: 'hotel_business', label: 'Business Hotel' },
      { slug: 'hotel_boutique', label: 'Boutique Hotel' },
      { slug: 'hotel_heritage', label: 'Heritage Hotel' },
      { slug: 'hotel_resort', label: 'Resort Hotel' },
      { slug: 'hotel_airport', label: 'Airport Hotel' },
    ],
  },
  {
    slug: 'staycation',
    label: 'Staycation',
    subcategories: [
      // Renamed from "Hotels" — star-classified hotels now live under the
      // top-level Hotel category. Slug kept so existing rows/businesses resolve.
      { slug: 'hotels', label: 'Homestays' },
      { slug: 'resorts', label: 'Resorts' },
      { slug: 'villas', label: 'Villas' },
      { slug: 'serviced_apartments', label: 'Serviced Apartments' },
      { slug: 'bungalow', label: 'Bungalow' },
      { slug: 'farmhouse', label: 'Farmhouse' },
      { slug: 'camping', label: 'Camping' },
    ],
  },
  {
    slug: 'buffet',
    label: 'Buffet',
    subcategories: [
      { slug: 'breakfast_buffet', label: 'Breakfast' },
      { slug: 'lunch_buffet', label: 'Lunch' },
      { slug: 'brunch_buffet', label: 'Brunch' },
      { slug: 'dinner_buffet', label: 'Dinner' },
    ],
  },
  {
    slug: 'real_estate',
    label: 'Real Estate',
    subcategories: [
      { slug: 'villa', label: 'Villa' },
      { slug: 'apartment', label: 'Apartment' },
    ],
  },
  {
    slug: 'healthcare',
    label: 'Healthcare',
    subcategories: [
      { slug: 'clinics', label: 'Clinics' },
      { slug: 'medical_stores', label: 'Medical Stores' },
      { slug: 'diagnostics_centers', label: 'Diagnostics Centers' },
      { slug: 'wellness_center', label: 'Wellness Center' },
      { slug: 'ayurveda_clinic', label: 'Ayurveda Clinic' },
      { slug: 'nursing_homes', label: 'Nursing Homes' },
      { slug: 'hospitals', label: 'Hospitals' },
      { slug: 'dialysis_centers', label: 'Dialysis Centers' },
      { slug: 'psychiatric_services', label: 'Psychiatric Services' },
      { slug: 'palliative_care', label: 'Palliative & End-of-life Care' },
      { slug: 'home_health_care', label: 'Home Health Care Services' },
      { slug: 'telemedicine', label: 'Telemedicine & Digital Health' },
      { slug: 'emergency_health', label: 'Emergency Health Services' },
    ],
  },
  {
    slug: 'venue_spots',
    label: 'Venue Spots',
    subcategories: [
      { slug: 'auditorium', label: 'Auditorium' },
      { slug: 'trade_center', label: 'Trade Center' },
      { slug: 'mandapams', label: 'Mandapams' },
    ],
  },
  {
    slug: 'fitness_wellness',
    label: 'Fitness & Wellness',
    subcategories: [
      { slug: 'spa', label: 'Spa' },
      { slug: 'gym', label: 'Gym' },
      { slug: 'ayurvedic_treatments', label: 'Ayurvedic Treatments' },
    ],
  },
  {
    slug: 'events',
    label: 'Events',
    subcategories: [
      { slug: 'music', label: 'Music' },
      { slug: 'night_life', label: 'Night Life' },
    ],
  },
  {
    slug: 'local_shop',
    label: 'Local Shop',
    subcategories: [
      { slug: 'supermarket', label: 'Supermarket' },
      { slug: 'hyper_market', label: 'Hyper Market' },
      { slug: 'kirana_store', label: 'Kirana Store' },
      { slug: 'bakery', label: 'Bakery' },
      { slug: 'provision_store', label: 'Provision Store' },
    ],
  },
  // ── Iteration 2: Business Category & Discovery Expansion ──
  // Additive only. Standardized names: "Salons" (not Saloons),
  // "Diagnostic Centers" (not Diagnosis Centers), "Home Care Services".
  {
    slug: 'personal_care',
    label: 'Personal Care',
    subcategories: [
      { slug: 'salons', label: 'Salons' },
    ],
  },
  {
    slug: 'retail_gifts',
    label: 'Retail & Gifts',
    subcategories: [
      { slug: 'gift_shops', label: 'Gift Shops' },
    ],
  },
  {
    slug: 'automotive_services',
    label: 'Automotive Services',
    subcategories: [
      { slug: 'tyre_shops', label: 'Tyre Shops' },
      { slug: 'puncture_repair_shops', label: 'Puncture Repair Shops' },
      { slug: 'mobile_puncture_services', label: 'Mobile Puncture Services' },
    ],
  },
  {
    slug: 'business_services',
    label: 'Business Services',
    subcategories: [
      { slug: 'health_insurance', label: 'Health Insurance' },
      { slug: 'life_insurance', label: 'Life Insurance' },
      { slug: 'travel_insurance', label: 'Travel Insurance' },
      { slug: 'group_health_insurance', label: 'Group Health Insurance' },
      { slug: 'fire_insurance', label: 'Fire Insurance' },
      { slug: 'personal_loan', label: 'Personal Loan' },
      { slug: 'home_loan', label: 'Home Loan' },
      { slug: 'vehicle_loan', label: 'Vehicle Loan' },
    ],
  },
];
