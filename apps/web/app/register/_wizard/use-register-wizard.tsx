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
import { RegisterRole, CivicOrgType, CATEGORIES } from './shared';

/** All registration wizard state and handlers; the page and each step read from it. */
export function useRegisterWizard() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  // Wizard Navigation
  const [currentStep, setCurrentStep] = useState(1);
  const [role, setRole] = useState<RegisterRole>('CUSTOMER');

  // Form states: Credentials (Step 2)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Business-specific Step 2 fields
  const [companyName, setCompanyName] = useState('');
  const [categorySlug, setCategorySlug] = useState('food');
  const [subcategorySlug, setSubcategorySlug] = useState('restaurants');
  const [halalStatus, setHalalStatus] = useState(''); // food businesses only
  const [referralCode, setReferralCode] = useState('');

  // ── Brand account: several outlets under one brand ──
  const [accountType, setAccountType] = useState<'SINGLE' | 'BRAND'>('SINGLE');
  const [brandNameInput, setBrandNameInput] = useState('');
  const [outletLabel, setOutletLabel] = useState('');
  const [billSeriesMode, setBillSeriesMode] = useState<BillSeriesMode | null>(null);
  const [sharedPrefix, setSharedPrefix] = useState('');
  // Set once the business being registered belongs to a brand (fresh brand signup, or resuming / adding an outlet).
  const [brandCtx, setBrandCtx] = useState<{
    id?: string;
    name: string;
    mode: BillSeriesMode;
    prefix: string;
  } | null>(null);
  // /register?outlet=<id>: a signed-in brand owner finishing an outlet they just added.
  const [outletMode, setOutletMode] = useState(false);
  const [outletError, setOutletError] = useState('');
  // The launch offer is one slot per brand — hide it once another outlet has claimed it.
  const [brandLaunchUsed, setBrandLaunchUsed] = useState(false);
  const [billingCity, setBillingCity] = useState('');

  // ── Step 3: business description, registration/KYC details, tags ──
  const [description, setDescription] = useState('');
  const [regDetails, setRegDetails] = useState<RegistrationDetails>({});
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // ── Step 4: plan / hotel classification / Home Chef tier, then payment ──
  const isHotel = categorySlug === 'hotel';
  const isHomeChef = subcategorySlug === 'home_chefs';
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [homeChefTier, setHomeChefTier] = useState<string>('');
  const [hotelStarRating, setHotelStarRating] = useState<number | null>(null);
  const [hotelAmenities, setHotelAmenities] = useState<HotelAmenities>({});
  const [amenityDetails, setAmenityDetails] = useState<Record<string, AmenityItem[]>>({});
  // ── Launch offer: first N registrations per category get one special-priced plan ──
  const launchOffer = useLaunchOffer();
  const launchSlotsLeft = launchOffer.slotsLeft(categorySlug);
  const canClaimLaunch = launchOffer.enabled && launchSlotsLeft > 0 && !brandLaunchUsed;
  const categoryLabel = CATEGORIES.find((c) => c.slug === categorySlug)?.label || categorySlug;
  const [claimLaunch, setClaimLaunch] = useState(false);
  // The last slot can go while someone is deciding — fall back to the regular plans.
  useEffect(() => {
    if (claimLaunch && !launchOffer.loading && !canClaimLaunch) setClaimLaunch(false);
  }, [claimLaunch, canClaimLaunch, launchOffer.loading]);
  /** Price stays hidden until the payer explicitly proceeds. */
  const [showPayment, setShowPayment] = useState(false);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [payerRef, setPayerRef] = useState('');

  // Invoice details, collected right after payment (our office raises the invoice).
  const [showInvoice, setShowInvoice] = useState(false);
  const [billingName, setBillingName] = useState('');
  const [billingHasGst, setBillingHasGst] = useState<boolean | null>(null);
  const [billingGstin, setBillingGstin] = useState('');
  const [billingPan, setBillingPan] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingPincode, setBillingPincode] = useState('');
  const [invoiceEmail, setInvoiceEmail] = useState('');

  /**
   * Resume an abandoned registration. Someone who signed up but never finished
   * (business still DRAFT) lands back here, so pull their draft and drop them
   * at the right step instead of making them start over.
   */
  const [resuming, setResuming] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof window === 'undefined') return;

        // Ask the API who this user is rather than trusting the localStorage
        // session shape (it varies between owners and staff, and is written
        // asynchronously at login). This is the authoritative source and works
        // for any signed-in business owner.
        // Outlet mode: pin the dashboard's active outlet to the one being finished, so the
        // owner/mine lookup below (active outlet first) resumes exactly that outlet.
        const outletParam = new URLSearchParams(window.location.search).get('outlet');
        if (outletParam) {
          setOutletMode(true);
          const sw = await apiService.put<any>('/v1/auth/active-business', {
            businessId: outletParam,
          });
          if (cancelled) return;
          if (sw.error) {
            setOutletError(sw.error);
            return;
          }
          invalidateActiveBusinessCache();
          await refreshUser();
        }

        let draft: any = null;
        const mine = await apiService.get<any>('/v1/businesses/owner/mine');
        const list = mine.data?.data || (Array.isArray(mine.data) ? mine.data : []);
        if (Array.isArray(list) && list.length > 0) draft = list[0];

        if (outletParam && draft?.id !== outletParam) {
          if (!cancelled)
            setOutletError('Could not open this outlet. Please try again from your outlets page.');
          return;
        }

        // Fall back to the session's entity id (covers a freshly created draft
        // that owner/mine hasn't picked up yet).
        if (!draft) {
          const stored = localStorage.getItem('user_session') || localStorage.getItem('user');
          if (!stored) return;
          const u = JSON.parse(stored);
          const entityId = u?.entity?.id || u?.businessId;
          const entityType = u?.entity?.type || (u?.businessId ? 'BUSINESS' : null);
          if (!entityId || entityType !== 'BUSINESS') return;
          const res = await onboardingService.getProgress(entityId);
          if (cancelled || !res.data || res.error) return;
          draft = res.data.business;
        }
        if (cancelled || !draft) return;
        setRole('BUSINESS');
        setBusinessId(draft.id);
        setCompanyName(draft.name || '');
        setDescription(draft.description || '');
        if (draft.category?.slug) setCategorySlug(draft.category.slug);
        if (draft.address) setAddress(draft.address);
        if (draft.city) {
          setCity(draft.city);
          setDistrict(draft.district || draft.city);
        }
        if (Array.isArray(draft.tags)) setTags(draft.tags);
        const draftBrand = draft.brand || null;
        const sharedSeries = draftBrand?.billSeriesMode === 'SHARED';
        setRegDetails({
          // Outlets of a brand carry the brand's name (the form locks that field).
          brandName: draftBrand?.name || draft.brandName || '',
          companyName: draft.companyName || '',
          companyType: draft.companyType || '',
          compliance: draft.compliance || {},
          ownerContact: draft.ownerContact || {},
          billingContact: draft.billingContact || {},
          supportContact: draft.supportContact || {},
          branchHead: draft.branchHead || {},
          categoryAttributes: draft.categoryAttributes || {},
          billSeriesPrefix:
            (sharedSeries ? draftBrand.billSeriesPrefix : draft.billSeriesPrefix) || '',
          operatingHours: draft.operatingHours ?? undefined,
        });
        if (draft.brandId || draftBrand) {
          setBrandCtx({
            id: draft.brandId || draftBrand?.id,
            name: draftBrand?.name || draft.brandName || '',
            mode: sharedSeries ? 'SHARED' : 'PER_OUTLET',
            prefix: draftBrand?.billSeriesPrefix || '',
          });
          setAccountType('BRAND');
          // One invoice/GST profile per brand: prefill from the head outlet, and see whether
          // another outlet already used the brand's single launch-offer slot.
          const brandId = draft.brandId || draftBrand?.id;
          const [bd, bm] = await Promise.all([
            apiService.get<any>(`/v1/brands/${brandId}/billing-defaults`),
            apiService.get<any>('/v1/brands/mine'),
          ]);
          if (cancelled) return;
          const d = bd.error ? null : (bd.data?.data ?? bd.data);
          if (d?.billingName) {
            setBillingName(d.billingName || '');
            setBillingHasGst(typeof d.hasGst === 'boolean' ? d.hasGst : null);
            setBillingGstin(d.gstin || '');
            setBillingPan(d.pan || '');
            setBillingAddress(d.addressLine || '');
            setBillingPincode(d.pincode || '');
            setInvoiceEmail(d.invoiceEmail || '');
            setBillingCity(d.city || '');
          }
          const bmData = bm.error ? null : bm.data?.brand ? bm.data : bm.data?.data;
          const siblings: any[] = bmData?.outlets || [];
          setBrandLaunchUsed(siblings.some((o) => o.id !== draft.id && o.launchOfferClaimedAt));
        }
        if (draft.hotelStarRating) setHotelStarRating(draft.hotelStarRating);
        if (draft.hotelAmenities) setHotelAmenities(draft.hotelAmenities);
        if (draft.amenityDetails) setAmenityDetails(draft.amenityDetails);

        // Already-registered businesses land on the profile step so they can
        // review/edit — never back at account creation, and never on payment,
        // which they've already been through. Only an unfinished DRAFT that
        // already saved its details continues straight to payment.
        const isDraft = (draft.status || '').toUpperCase() === 'DRAFT';
        let step = 3;
        if (isDraft) {
          try {
            const prog = await onboardingService.getProgress(draft.id);
            const done: string[] = prog.data?.onboardingProgress?.stepsCompleted || [];
            if (done.includes('STEP_3')) step = 4;
          } catch {
            /* keep step 3 */
          }
        }
        if (!cancelled) setCurrentStep(step);
      } catch {
        /* resume is best-effort — fall back to a fresh registration */
      } finally {
        if (!cancelled) setResuming(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Businesses register and pay in one flow, so they get an extra step.
  const STEP_TITLES =
    role === 'BUSINESS'
      ? ['Account Type', 'Credentials', 'Business Profile', 'Plan & Payment']
      : ['Account Type', 'Credentials', 'Profile Setup'];
  const TOTAL_STEPS = STEP_TITLES.length;
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  // Civic-specific fields
  const [civicOrgType, setCivicOrgType] = useState<CivicOrgType>('NGO');
  const [organizationName, setOrganizationName] = useState('');

  const [tenantId, setTenantId] = useState('');
  const [businessId, setBusinessId] = useState('');

  // Form states: Kerala Entity Profile details & Doc uploads (Step 4)
  // City is selectable from the serviceable Kerala cities. District mirrors city.
  const [district, setDistrict] = useState('Thiruvananthapuram');
  const [city, setCity] = useState('Thiruvananthapuram');
  const [address, setAddress] = useState('');
  const [deptType, setDeptType] = useState('Local');

  // Document states
  const [certFile, setCertFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [govtIdFile, setGovtIdFile] = useState<File | null>(null);

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Password Complexity Validation Helpers
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid =
    hasMinLength && hasUppercase && hasLowercase && hasDigit && hasSpecialChar;

  // Phone Validation Helper (exactly 10 digits)
  const isPhoneValid = /^\d{10}$/.test(phone);

  // Email Validation Helper
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Step 2 Submission — real API only, no mock fallback
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!isEmailValid) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!isPhoneValid) {
      setError('Phone number must contain exactly 10 digits.');
      return;
    }
    if (!isPasswordValid) {
      setError('Password does not meet the complexity requirements.');
      return;
    }
    if (!acceptedTerms || !acceptedPrivacy) {
      setError('You must accept the Terms of Service and Privacy Policy to register.');
      return;
    }

    setLoading(true);

    try {
      if (role === 'BUSINESS') {
        if (!companyName.trim()) {
          setError('Company / Trading name is required.');
          setLoading(false);
          return;
        }
        if (accountType === 'BRAND') {
          const brandProblem = !brandNameInput.trim()
            ? 'Brand name is required for a brand account.'
            : !billSeriesMode
              ? 'Tell us whether the bill number series is the same across all your outlets.'
              : billSeriesMode === 'SHARED' && !sharedPrefix.trim()
                ? 'Enter the shared bill series prefix, e.g. SC/2026/.'
                : '';
          if (brandProblem) {
            setError(brandProblem);
            setLoading(false);
            return;
          }
        }

        const res = await apiService.post<any>('/v1/auth/business/signup', {
          ownerName: name,
          email,
          phone,
          password,
          businessName: companyName,
          categorySlug,
          profileType: 'OWNER',
          ...(accountType === 'BRAND'
            ? {
                accountType: 'BRAND',
                brandName: brandNameInput.trim(),
                ...(outletLabel.trim() ? { outletLabel: outletLabel.trim() } : {}),
                billSeriesMode,
                ...(billSeriesMode === 'SHARED' ? { billSeriesPrefix: sharedPrefix.trim() } : {}),
              }
            : {}),
          ...(referralCode.trim() ? { referralCode: referralCode.trim() } : {}),
          ...(categorySlug === 'food' && halalStatus ? { halalStatus } : {}),
          acceptedTerms,
          acceptedPrivacyPolicy: acceptedPrivacy,
        });

        if (res.error || !res.data) {
          setError(res.error || 'Registration failed. Please try again.');
          return;
        }

        setBusinessId(res.data.businessId || '');
        setTenantId(res.data.user?.tenantId || '');
        if (accountType === 'BRAND' && billSeriesMode) {
          setBrandCtx({
            name: brandNameInput.trim(),
            mode: billSeriesMode,
            prefix: sharedPrefix.trim(),
          });
          setRegDetails((prev) => ({
            ...prev,
            brandName: brandNameInput.trim(),
            billSeriesPrefix:
              billSeriesMode === 'SHARED' ? sharedPrefix.trim() : prev.billSeriesPrefix,
          }));
        }

        // Cookies set by signup API — refresh user state without redirecting
        const refreshedUser = await refreshUser();
        if (!refreshedUser) {
          setError('Account created but session could not be established. Please log in manually.');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        setSuccess(
          'Business account created! Complete your profile below to submit for verification.',
        );
        setCurrentStep(3);
      } else if (role === 'NGO_COMMUNITY') {
        // Civic signup — NGO / Community / News Forum
        if (!organizationName.trim()) {
          setError('Organisation name is required.');
          setLoading(false);
          return;
        }

        const res = await apiService.post<any>('/v1/auth/civic/signup', {
          organizationType: civicOrgType,
          organizationName: organizationName.trim(),
          contactName: name,
          email,
          phone,
          password,
          ...(referralCode.trim() ? { referralCode: referralCode.trim() } : {}),
          acceptedTerms,
          acceptedPrivacyPolicy: acceptedPrivacy,
        });

        if (res.error || !res.data) {
          setError(res.error || 'Registration failed. Please try again.');
          return;
        }

        const refreshedUser = await refreshUser();
        if (!refreshedUser) {
          setError('Account created but session could not be established. Please log in manually.');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        setSuccess('Organisation registered! Redirecting to your dashboard...');
        setTimeout(() => router.push('/civic/dashboard'), 1500);
      } else {
        // Customer / Government signup — tenantId auto-resolved by API
        const res = await apiService.post<any>('/v1/auth/signup', {
          email,
          password,
          name,
          phone,
          role: role === 'GOVERNMENT' ? 'GOVERNMENT_ADMIN' : 'USER',
          ...(referralCode.trim() ? { referralCode: referralCode.trim() } : {}),
          acceptedTerms,
          acceptedPrivacyPolicy: acceptedPrivacy,
        });

        if (res.error || !res.data) {
          setError(res.error || 'Registration failed. Please try again.');
          return;
        }

        if (res.data.user?.tenantId) setTenantId(res.data.user.tenantId);

        // Cookies set by signup API — refresh user state without redirecting
        const refreshedUser = await refreshUser();
        if (!refreshedUser) {
          setError('Account created but session could not be established. Please log in manually.');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        if (role === 'CUSTOMER') {
          setSuccess('Account created successfully! Redirecting...');
          setTimeout(() => router.push('/'), 1500);
        } else {
          setSuccess('Account created! Complete your department profile below.');
          setCurrentStep(3);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper file uploader using R2 media client APIs
  const uploadFileToServer = async (
    file: File,
    isGovt = false,
  ): Promise<{ fileUrl: string; fileKey: string }> => {
    setUploadProgress(15);
    // 1. Fetch pre-signed url
    let presign;
    if (isGovt) {
      // Find logged in government entity
      const stored = localStorage.getItem('user_session');
      const currentUserObj = stored ? JSON.parse(stored) : null;
      const entityId = currentUserObj?.entity?.id;
      if (!entityId) throw new Error('Government entity ID session not found.');
      presign = await universalOnboardingService.getSignedUrl(entityId, file.name, file.type);
    } else {
      presign = await onboardingService.getSignedUrl(businessId, file.name, file.type);
    }

    if (!presign.data || presign.error) {
      throw new Error(presign.error || `Failed to fetch upload URL for ${file.name}`);
    }
    setUploadProgress(40);

    const { uploadUrl, fileKey } = presign.data;

    // 2. Put file content to storage URL
    const uploadSuccess = await onboardingService.uploadFile(uploadUrl, file);
    if (!uploadSuccess) {
      throw new Error(`Failed to transmit file payload for ${file.name}`);
    }
    setUploadProgress(75);

    // Build URL to represent the saved item in DB
    const finalUrl = uploadUrl.startsWith('/')
      ? uploadUrl.split('?')[0] // local mock URL
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'saas-uploads'}/${fileKey}`;

    setUploadProgress(100);
    return { fileUrl: finalUrl, fileKey };
  };

  // Step 4 Submission ( केरल entity profile details & document upload )
  /**
   * Final business step: lock in the plan (or hotel classification), record the
   * QR payment with its proof, then submit for verification. The price is only
   * ever computed here — the server recomputes it, so this is display-only.
   */
  const handleBusinessFinalSubmit = async () => {
    if (!businessId) {
      setError('Session lost — please sign in again to finish registration.');
      return;
    }
    if (!paymentProof) {
      setError('Please upload your payment screenshot before submitting.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // 1. Create the subscription for the chosen plan / classification / tier
      //    — or, for a launch-offer claim, reserve the slot (still needs payment below).
      let subscriptionId: string | undefined;
      if (claimLaunch) {
        if (isHotel) {
          // Saves the star rating and amenities onto the listing; pricing comes
          // from the launch-offer claim, not from the hotel charge below.
          const hotelRes = await onboardingService.assignHotelSubscription(
            businessId,
            hotelStarRating || 0,
            hotelAmenities,
            amenityDetails,
          );
          if (hotelRes.error) throw new Error(hotelRes.error);
        }
        const claimRes = await onboardingService.claimLaunchOffer(businessId);
        if (claimRes.error) {
          await launchOffer.refresh(); // slots may have just run out
          throw new Error(claimRes.error);
        }
        subscriptionId = (claimRes.data as any)?.id;
      } else {
        const assignRes = isHotel
          ? await onboardingService.assignHotelSubscription(
              businessId,
              hotelStarRating || 0,
              hotelAmenities,
              amenityDetails,
            )
          : isHomeChef
            ? await onboardingService.assignHomeChefSubscription(businessId, homeChefTier)
            : await onboardingService.assignSubscription(
                businessId,
                selectedPlan,
                PLAN_DURATION_DAYS,
              );
        if (assignRes.error) throw new Error(assignRes.error);
        subscriptionId = (assignRes.data as any)?.id;
      }

      // 2. Upload the payment screenshot for admin verification.
      setUploadProgress(20);
      const signed = await onboardingService.getSignedUrl(
        businessId,
        paymentProof.name,
        paymentProof.type,
        'payment',
      );
      if (!signed.data || signed.error) {
        throw new Error(signed.error || 'Failed to get an upload URL for the screenshot.');
      }
      const uploaded = await onboardingService.uploadFile(signed.data.uploadUrl, paymentProof);
      if (!uploaded) throw new Error('Failed to upload the payment screenshot.');
      setUploadProgress(70);

      // 3. Record the payment.
      const charge = computeHotelCharge(hotelStarRating, hotelAmenities);
      const plan = getPlan(selectedPlan);
      const homeChefPlan = getHomeChefPlan(homeChefTier);
      const launchPrice = launchOffer.status?.price ?? 2500;
      // Amount charged is GST-inclusive; the server recomputes and splits it.
      const amount = withTax(
        claimLaunch
          ? launchPrice
          : isHotel
            ? charge.total
            : isHomeChef
              ? homeChefPlan?.price || 0
              : plan?.offerPrice || 0,
      ).total;

      // Invoice details first — if this fails the payment isn't recorded, so the
      // office never ends up with a payment it can't raise an invoice for.
      const billRes = await onboardingService.saveBillingProfile(businessId, {
        billingName: billingName.trim(),
        hasGst: !!billingHasGst,
        gstin: billingHasGst ? billingGstin.trim().toUpperCase() : undefined,
        pan: billingPan.trim().toUpperCase() || undefined,
        addressLine: billingAddress.trim(),
        city: billingCity || city,
        state: 'Kerala',
        pincode: billingPincode.trim(),
        invoiceEmail: invoiceEmail.trim(),
      });
      if (billRes.error) throw new Error(billRes.error);

      const payRes = await onboardingService.submitPayment(businessId, {
        amount,
        method: 'UPI_QR',
        proofUrl: JSON.stringify({ bucket: 'verification-documents', path: signed.data.fileKey }),
        transactionRef: payerRef || undefined,
        subscriptionId,
        packageName: claimLaunch
          ? 'LAUNCH_SPECIAL'
          : isHotel
            ? `HOTEL_${hotelStarRating}STAR`
            : isHomeChef
              ? `HOMECHEF_${homeChefTier}`
              : selectedPlan,
      });
      if (payRes.error) throw new Error(payRes.error);
      setUploadProgress(100);

      // 4. Submit for verification.
      const submitRes = await onboardingService.submitForVerification(businessId);
      if (submitRes.error) throw new Error(submitRes.error);

      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('user_session') || localStorage.getItem('user');
        if (stored) {
          try {
            const u = JSON.parse(stored);
            if (u.entity && u.entity.id === businessId) {
              u.entity.status = 'PENDING_VERIFICATION';
              localStorage.setItem('user_session', JSON.stringify(u));
              localStorage.setItem('user', JSON.stringify(u));
            }
          } catch (_) {}
        }
      }

      const submittedPaymentId = (payRes.data as any)?.id;
      setSuccess('Payment submitted for verification! Redirecting to your invoice...');
      setTimeout(
        () =>
          router.push(
            submittedPaymentId ? `/dashboard/invoice/${submittedPaymentId}` : '/dashboard',
          ),
        2000,
      );
    } catch (err: any) {
      setError(err.message || 'Could not complete registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep4Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!address.trim()) {
      setError('Address is required.');
      return;
    }

    // File uploads are optional — can be added later from dashboard.
    // Submit always reaches verification queue.

    setLoading(true);

    try {
      if (role === 'BUSINESS') {
        // Persist everything collected so far, then move on to plan + payment.
        // Details are saved before payment so an abandoned draft can resume.
        try {
          await onboardingService.updateStep(businessId, 2, {
            businessDescription:
              description.trim() || `Kerala based company ${companyName} operating in ${district}.`,
            subcategorySlugs: subcategorySlug ? [subcategorySlug] : [],
            tags,
          });
        } catch (e) {
          console.warn('Step 2 update failed:', e);
        }

        try {
          await onboardingService.updateStep(businessId, 3, {
            address,
            city,
            state: 'Kerala',
            postalCode: '682001',
            district,
            // Registration / KYC details
            brandName: regDetails.brandName,
            companyName: regDetails.companyName,
            companyType: regDetails.companyType,
            compliance: regDetails.compliance,
            ownerContact: regDetails.ownerContact,
            billingContact: regDetails.billingContact,
            supportContact: regDetails.supportContact,
            branchHead: regDetails.branchHead,
            categoryAttributes: regDetails.categoryAttributes,
            // A brand with a shared series keeps the prefix on the brand, not on each outlet.
            billSeriesPrefix: brandCtx?.mode === 'SHARED' ? undefined : regDetails.billSeriesPrefix,
            operatingHours: regDetails.operatingHours,
          });
        } catch (e) {
          console.warn('Step 3 update failed:', e);
        }

        // Registration certificate — stored in verification-documents so it
        // reaches the admin review panel. Surface failures.
        if (certFile) {
          setUploadProgress(20);
          const certRes = await onboardingService.uploadBusinessDocument(
            businessId,
            certFile,
            'REGISTRATION_CERTIFICATE',
          );
          if (certRes.error) {
            throw new Error(`Verification document upload failed: ${certRes.error}`);
          }
          setUploadProgress(100);
        }

        // Logo — best-effort, can be replaced later from settings.
        if (logoFile) {
          try {
            const logoData = await uploadFileToServer(logoFile);
            await onboardingService.registerMedia(businessId, {
              name: logoFile.name,
              mediaType: 'LOGO',
              fileUrl: logoData.fileUrl,
              fileKey: logoData.fileKey,
              mimeType: logoFile.type,
              fileSize: logoFile.size,
            });
          } catch (e) {
            console.warn('Logo upload failed (continuing):', e);
          }
        }

        setLoading(false);
        setCurrentStep(4);
        return;
      } else if (role === 'GOVERNMENT') {
        // 1. Promote role post sign-in to create government profile entity
        const roleSelectRes = await authService.selectRole({
          role: 'GOVERNMENT_ADMIN',
          entityType: 'GOVERNMENT',
          name: name,
          phone: phone,
        });

        const stored = localStorage.getItem('user_session');
        const currentUserObj = stored ? JSON.parse(stored) : null;
        const entityId = currentUserObj?.entity?.id || roleSelectRes?.entity?.id;

        if (!entityId) {
          throw new Error('Could not establish Government profile entity identity.');
        }

        // 2. Update step 1 (Department details) — best-effort
        try {
          await universalOnboardingService.updateStep(entityId, 1, {
            departmentName: name,
            officialEmail: email,
            departmentType: deptType,
          });
        } catch (e) {
          console.warn('Govt step 1 failed:', e);
        }

        // 3. Update step 2 (Administrative coverage) — best-effort
        try {
          await universalOnboardingService.updateStep(entityId, 2, {
            district: district,
          });
        } catch (e) {
          console.warn('Govt step 2 failed:', e);
        }

        // 4. Upload Department ID Proof — best-effort
        try {
          const idData = await uploadFileToServer(govtIdFile!, true);
          await universalOnboardingService.registerDocument(entityId, {
            documentType: 'ID_PROOF',
            fileUrl: idData.fileUrl,
            filename: govtIdFile!.name,
            mimeType: govtIdFile!.type,
          });
        } catch (e) {
          console.warn('Govt ID upload failed (continuing):', e);
        }

        // 5. Submit application — CRITICAL
        const submitRes = await universalOnboardingService.submitForVerification(entityId);
        if (submitRes.error) {
          throw new Error(submitRes.error);
        }

        // Update local session status
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('user_session') || localStorage.getItem('user');
          if (stored) {
            try {
              const u = JSON.parse(stored);
              if (u.entity && u.entity.id === entityId) {
                u.entity.status = 'PENDING_VERIFICATION';
                localStorage.setItem('user_session', JSON.stringify(u));
                localStorage.setItem('user', JSON.stringify(u));
              }
            } catch (_) {}
          }
        }

        setSuccess('Government department onboarding details successfully registered!');
        setTimeout(() => {
          router.push('/government/dashboard');
        }, 2000);
      }
    } catch (err: any) {
      setError(err?.message || 'Onboarding file submission or registration failed.');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return {
    router,
    refreshUser,
    currentStep,
    setCurrentStep,
    role,
    setRole,
    name,
    setName,
    email,
    setEmail,
    phone,
    setPhone,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    companyName,
    setCompanyName,
    categorySlug,
    setCategorySlug,
    subcategorySlug,
    setSubcategorySlug,
    halalStatus,
    setHalalStatus,
    referralCode,
    setReferralCode,
    accountType,
    setAccountType,
    brandNameInput,
    setBrandNameInput,
    outletLabel,
    setOutletLabel,
    billSeriesMode,
    setBillSeriesMode,
    sharedPrefix,
    setSharedPrefix,
    brandCtx,
    setBrandCtx,
    outletMode,
    setOutletMode,
    outletError,
    setOutletError,
    brandLaunchUsed,
    setBrandLaunchUsed,
    billingCity,
    setBillingCity,
    description,
    setDescription,
    regDetails,
    setRegDetails,
    tags,
    setTags,
    tagInput,
    setTagInput,
    isHotel,
    isHomeChef,
    selectedPlan,
    setSelectedPlan,
    homeChefTier,
    setHomeChefTier,
    hotelStarRating,
    setHotelStarRating,
    hotelAmenities,
    setHotelAmenities,
    amenityDetails,
    setAmenityDetails,
    launchOffer,
    launchSlotsLeft,
    canClaimLaunch,
    categoryLabel,
    claimLaunch,
    setClaimLaunch,
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
    resuming,
    setResuming,
    STEP_TITLES,
    TOTAL_STEPS,
    acceptedTerms,
    setAcceptedTerms,
    acceptedPrivacy,
    setAcceptedPrivacy,
    civicOrgType,
    setCivicOrgType,
    organizationName,
    setOrganizationName,
    tenantId,
    setTenantId,
    businessId,
    setBusinessId,
    district,
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
    setLoading,
    error,
    setError,
    success,
    setSuccess,
    uploadProgress,
    setUploadProgress,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasDigit,
    hasSpecialChar,
    isPasswordValid,
    isPhoneValid,
    isEmailValid,
    handleStep2Submit,
    uploadFileToServer,
    handleBusinessFinalSubmit,
    handleStep4Submit,
  };
}

export type Wizard = ReturnType<typeof useRegisterWizard>;
