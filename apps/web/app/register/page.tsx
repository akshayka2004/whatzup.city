'use client';

import React, { useState, useEffect } from 'react';
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
import {
  SUBSCRIPTION_PLANS, PLAN_DURATION_DAYS, getPlan, formatINR,
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
} from 'lucide-react';

type RegisterRole = 'CUSTOMER' | 'BUSINESS' | 'GOVERNMENT' | 'NGO_COMMUNITY';
type CivicOrgType = 'NGO' | 'COMMUNITY' | 'NEWS_FORUM';

const KERALA_DISTRICTS = [
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

const CATEGORIES = [
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

export default function UnifiedRegisterPage() {
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

  // ── Step 3: business description, registration/KYC details, tags ──
  const [description, setDescription] = useState('');
  const [regDetails, setRegDetails] = useState<RegistrationDetails>({});
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // ── Step 4: plan / hotel classification, then payment ───────────
  const isHotel = categorySlug === 'hotel';
  const [selectedPlan, setSelectedPlan] = useState<string>('WHTZUP_X');
  const [hotelStarRating, setHotelStarRating] = useState<number | null>(null);
  const [hotelAmenities, setHotelAmenities] = useState<HotelAmenities>({});
  /** Price stays hidden until the payer explicitly proceeds. */
  const [showPayment, setShowPayment] = useState(false);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [payerRef, setPayerRef] = useState('');

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
        let draft: any = null;
        const mine = await apiService.get<any>('/v1/businesses/owner/mine');
        const list = mine.data?.data || (Array.isArray(mine.data) ? mine.data : []);
        if (Array.isArray(list) && list.length > 0) draft = list[0];

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
        if (draft.city) { setCity(draft.city); setDistrict(draft.district || draft.city); }
        if (Array.isArray(draft.tags)) setTags(draft.tags);
        setRegDetails({
          brandName: draft.brandName || '',
          companyName: draft.companyName || '',
          companyType: draft.companyType || '',
          compliance: draft.compliance || {},
          ownerContact: draft.ownerContact || {},
          billingContact: draft.billingContact || {},
          supportContact: draft.supportContact || {},
          branchHead: draft.branchHead || {},
          categoryAttributes: draft.categoryAttributes || {},
        });
        if (draft.hotelStarRating) setHotelStarRating(draft.hotelStarRating);
        if (draft.hotelAmenities) setHotelAmenities(draft.hotelAmenities);

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
    return () => { cancelled = true; };
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
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasDigit && hasSpecialChar;

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

        const res = await apiService.post<any>('/v1/auth/business/signup', {
          ownerName: name, email, phone, password,
          businessName: companyName, categorySlug, profileType: 'OWNER',
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

        // Cookies set by signup API — refresh user state without redirecting
        const refreshedUser = await refreshUser();
        if (!refreshedUser) {
          setError('Account created but session could not be established. Please log in manually.');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        setSuccess('Business account created! Complete your profile below to submit for verification.');
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
          email, password, name, phone,
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
  const uploadFileToServer = async (file: File, isGovt = false): Promise<{ fileUrl: string; fileKey: string }> => {
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
      // 1. Create the subscription for the chosen plan / classification.
      const assignRes = isHotel
        ? await onboardingService.assignHotelSubscription(
            businessId,
            hotelStarRating || 0,
            hotelAmenities,
          )
        : await onboardingService.assignSubscription(businessId, selectedPlan, PLAN_DURATION_DAYS);
      if (assignRes.error) throw new Error(assignRes.error);
      const subscriptionId = (assignRes.data as any)?.id;

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
      const amount = isHotel ? charge.total : plan?.offerPrice || 0;

      const payRes = await onboardingService.submitPayment(businessId, {
        amount,
        method: 'UPI_QR',
        proofUrl: JSON.stringify({ bucket: 'verification-documents', path: signed.data.fileKey }),
        transactionRef: payerRef || undefined,
        subscriptionId,
        packageName: isHotel ? `HOTEL_${hotelStarRating}STAR` : selectedPlan,
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

      setSuccess('Payment submitted for verification! Redirecting to your dashboard...');
      setTimeout(() => router.push('/dashboard'), 2000);
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
              description.trim() ||
              `Kerala based company ${companyName} operating in ${district}.`,
            subcategorySlugs: subcategorySlug ? [subcategorySlug] : [],
            tags,
          });
        } catch (e) { console.warn('Step 2 update failed:', e); }

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
          });
        } catch (e) { console.warn('Step 3 update failed:', e); }

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
          } catch (e) { console.warn('Logo upload failed (continuing):', e); }
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
        } catch (e) { console.warn('Govt step 1 failed:', e); }

        // 3. Update step 2 (Administrative coverage) — best-effort
        try {
          await universalOnboardingService.updateStep(entityId, 2, {
            district: district,
          });
        } catch (e) { console.warn('Govt step 2 failed:', e); }

        // 4. Upload Department ID Proof — best-effort
        try {
          const idData = await uploadFileToServer(govtIdFile!, true);
          await universalOnboardingService.registerDocument(entityId, {
            documentType: 'ID_PROOF',
            fileUrl: idData.fileUrl,
            filename: govtIdFile!.name,
            mimeType: govtIdFile!.type,
          });
        } catch (e) { console.warn('Govt ID upload failed (continuing):', e); }

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

  return (
    <div className="min-h-screen w-full font-sans flex flex-col"
         >
      {/* Centered content area */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 relative overflow-hidden text-foreground">
        {/* Ambient background decoration */}
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[160px] pointer-events-none"
             style={{ background: 'rgba(113,90,90,0.08)' }} />
        <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] pointer-events-none"
             style={{ background: 'rgba(113,90,90,0.06)' }} />

      <div className="w-full max-w-4xl relative z-10 space-y-6">
        {/* Top Header */}
        <div className="text-center space-y-2 mb-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-muted-foreground text-xs font-semibold tracking-wide">
            <img src="/logo.png" alt="Whtzup.city Logo" className="h-5 w-auto object-contain" />
            <span className="font-semibold tracking-tight">whtzup.city</span>
          </div>
          <h1 className="text-foregroundxl md:text-4xl font-extrabold tracking-tight">
            Create Your Account
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Complete registration steps to unlock full catalog listings, reviews, and alerts.
          </p>
        </div>

        {/* Stepper bar */}
        <div className="w-full p-4 rounded-2xl backdrop-blur-xl"
             >
          <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground mb-3 px-1">
            <span>Progress Status</span>
            <span className="text-muted-foreground">
              Step {currentStep} of {TOTAL_STEPS}: {STEP_TITLES[currentStep - 1]}
            </span>
          </div>
          <Progress value={(currentStep / TOTAL_STEPS) * 100} className="h-2 bg-background" />
          <div
            className={`grid gap-2 mt-4 text-[10px] text-center font-mono ${
              TOTAL_STEPS === 4 ? 'grid-cols-4' : 'grid-cols-3'
            }`}
          >
            {STEP_TITLES.map((title, i) => (
              <span
                key={i}
                className={
                  i + 1 < currentStep
                    ? 'text-emerald-400 font-bold'
                    : i + 1 === currentStep
                      ? 'text-muted-foreground font-bold border-b border-border pb-1'
                      : 'text-muted-foreground/50'
                }
              >
                {title}
              </span>
            ))}
          </div>
        </div>

        {/* Main Alert Banners */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium flex items-center gap-3">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Form Card */}
        <Card className="backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-2xl relative overflow-hidden"
              >

          {/* STEP 1: Account Type Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center md:text-left">
                <h2 className="text-xl font-bold text-foreground">Select Account Class</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose how you plan to use Whtzup.city. Select from standard roles:
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  {
                    type: 'CUSTOMER',
                    title: 'Customer',
                    description: 'Explore verified business catalogs, post public ratings, claim offer coupons.',
                    icon: UserIcon,
                    color: 'from-violet-600/20 to-violet-500/5 hover:border-border',
                    iconColor: 'text-violet-400',
                  },
                  {
                    type: 'BUSINESS',
                    title: 'Company / Business',
                    description: 'Register Kerala-based companies. Upload certificates, manage listings & campaigns.',
                    icon: Building2,
                    color: 'from-cyan-600/20 to-cyan-500/5 hover:border-cyan-500/50',
                    iconColor: 'text-cyan-400',
                  },
                  {
                    type: 'GOVERNMENT',
                    title: 'Govt Body',
                    description: 'Publish administrative alerts, notices, and manage district announcements.',
                    icon: ShieldAlert,
                    color: 'from-amber-600/20 to-amber-500/5 hover:border-amber-500/50',
                    iconColor: 'text-amber-400',
                  },
                  {
                    type: 'NGO_COMMUNITY',
                    title: 'NGO / Community',
                    description: 'Register NGOs, community groups, and news forums. Publish notices and alerts.',
                    icon: Heart,
                    color: 'from-rose-600/20 to-rose-500/5 hover:border-rose-500/50',
                    iconColor: 'text-rose-400',
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
                          <span className="p-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                            <CheckCircle className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground mb-1 text-sm">{item.title}</h3>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{item.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Civic org sub-type selector */}
              {role === 'NGO_COMMUNITY' && (
                <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-3">
                  <p className="text-xs font-semibold text-rose-400">Select Organisation Type</p>
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
                            ? 'border-rose-400/60 bg-rose-500/10 text-rose-400'
                            : 'border-border text-muted-foreground hover:border-rose-500/30'
                        }`}
                      >
                        <OIcon className="h-4 w-4" />
                        <span className="text-[11px] font-semibold">{label}</span>
                        <span className="text-[9px] opacity-60">{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-border">
                <Link href="/login" className="text-muted-foreground hover:text-foreground text-sm font-semibold flex items-center gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back to Login
                </Link>

                <Button
                  onClick={() => setCurrentStep(2)}
                  className="rounded-xl h-11 px-6 font-semibold text-[#D3DAD9] hover:opacity-90 transition-opacity"
                >
                  Continue <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Account Details & Validation */}
          {currentStep === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-6">
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
                          email && !isEmailValid ? 'border-rose-500/50' : 'border-input'
                        }`}
                        required
                      />
                    </div>
                    {email && !isEmailValid && (
                      <p className="text-[10px] text-rose-400">Please enter a valid email format</p>
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
                          phone && !isPhoneValid ? 'border-rose-500/50' : 'border-input'
                        }`}
                        required
                      />
                    </div>
                    {phone && !isPhoneValid && (
                      <p className="text-[10px] text-rose-400">Phone must contain exactly 10 digits</p>
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
                          password && !isPasswordValid ? 'border-rose-500/50' : 'border-input'
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground cursor-pointer"
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
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <p className={hasMinLength ? 'text-emerald-400' : 'text-muted-foreground'}>✔ Minimum 8 characters</p>
                      <p className={hasUppercase ? 'text-emerald-400' : 'text-muted-foreground'}>✔ At least one uppercase letter</p>
                      <p className={hasLowercase ? 'text-emerald-400' : 'text-muted-foreground'}>✔ At least one lowercase letter</p>
                      <p className={hasDigit ? 'text-emerald-400' : 'text-muted-foreground'}>✔ At least one number digit</p>
                      <p className={hasSpecialChar ? 'text-emerald-400' : 'text-muted-foreground'}>✔ At least one special character</p>
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
                                  ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                                  : 'bg-background border-input text-muted-foreground hover:bg-muted/40'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground">Displayed as a tag on your business profile.</p>
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
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#715A5A] cursor-pointer"
                    required
                  />
                  <span className="text-xs text-muted-foreground group-hover:text-muted-foreground transition-colors leading-relaxed">
                    I agree to the{' '}
                    <Link
                      href="/terms-of-service"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#c4a8a8] underline underline-offset-2 hover:text-white"
                    >
                      Terms of Service
                    </Link>
                    {' '}of Whtzup.city <span className="text-rose-400">*</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={acceptedPrivacy}
                    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#715A5A] cursor-pointer"
                    required
                  />
                  <span className="text-xs text-muted-foreground group-hover:text-muted-foreground transition-colors leading-relaxed">
                    I have read and accept the{' '}
                    <Link
                      href="/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#c4a8a8] underline underline-offset-2 hover:text-white"
                    >
                      Privacy Policy
                    </Link>
                    {' '}<span className="text-rose-400">*</span>
                  </span>
                </label>
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  disabled={loading}
                  className="h-11 px-5 bg-background border border-input text-muted-foreground rounded-xl cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
                </Button>

                <Button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl h-11 px-6 font-semibold flex items-center gap-1.5 text-[#D3DAD9] hover:opacity-90 transition-opacity"
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
          )}

          {/* STEP 3: Kerala Entity Profile Setup & Document Upload */}
          {currentStep === 3 && (
            <form onSubmit={handleStep4Submit} className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-zinc-400" />
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
                      onChange={(e) => { setCity(e.target.value); setDistrict(e.target.value); }}
                      className="w-full h-11 pl-10 pr-4 border border-input bg-background text-foreground rounded-xl text-sm focus:ring-1 focus:outline-none appearance-none cursor-pointer"
                    >
                      {KERALA_CITIES.map((c) => (
                        <option key={c} value={c}>{c}, Kerala</option>
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
                    <label className="text-xs font-medium text-muted-foreground">Administrative Level Type</label>
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
                        <FileCheck className="h-4 w-4 text-cyan-400" />
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
                          <p className="text-[11px] font-semibold text-muted-foreground truncate">{certFile.name}</p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground">Click to select registration file (Max 10MB)</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-cyan-400" />
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
                          <p className="text-[11px] font-semibold text-muted-foreground truncate">{logoFile.name}</p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground">Click to select company logo (Max 10MB)</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* File Upload Section for GOVERNMENT */}
                {role === 'GOVERNMENT' && (
                  <div className="space-y-2 pt-3 border-t border-border">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <FileCheck className="h-4 w-4 text-amber-400" />
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
                        <p className="text-[11px] font-semibold text-amber-400 truncate">{govtIdFile.name}</p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">Click to select verification authority letter (Max 10MB)</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Uploading progress tracker */}
                {uploadProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
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
                    <label className="text-xs font-medium text-muted-foreground">
                      About your business
                    </label>
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
                      Search tags <span className="text-[10px]">(help customers find you)</span>
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
                            className="px-3 py-1.5 rounded-full text-xs bg-primary/10 border border-primary/20 text-primary cursor-pointer"
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
                    <RegistrationDetailsForm
                      value={regDetails}
                      onChange={setRegDetails}
                      categorySlug={categorySlug}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-6 border-t border-border">
                <Button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl h-11 px-6 font-semibold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition text-[#D3DAD9]"
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
          )}

          {/* ── STEP 4 (business only): plan / classification, then payment ── */}
          {currentStep === 4 && role === 'BUSINESS' && (
            <div className="space-y-6">
              {!showPayment ? (
                <>
                  <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <Layers className="h-5 w-5 text-zinc-400" />
                      {isHotel ? 'Hotel Classification & Services' : 'Choose Your Plan'}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isHotel
                        ? 'Select your star classification and the services you offer. Your total is shown on the next screen.'
                        : `Valid for ${PLAN_DURATION_DAYS} days.`}
                    </p>
                  </div>

                  {isHotel ? (
                    <>
                      <div>
                        <h3 className="text-sm font-bold text-foreground mb-2">Star classification</h3>
                        <div className="grid grid-cols-5 gap-2">
                          {STAR_OPTIONS.map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setHotelStarRating(star)}
                              className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                                hotelStarRating === star
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border hover:border-slate-500'
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
                        <div className="grid sm:grid-cols-2 gap-2">
                          {HOTEL_AMENITIES.map((a) => {
                            const on = !!hotelAmenities[a.key]?.selected;
                            return (
                              <button
                                key={a.key}
                                type="button"
                                onClick={() =>
                                  setHotelAmenities((prev) => ({
                                    ...prev,
                                    [a.key]: { ...prev[a.key], selected: !on },
                                  }))
                                }
                                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                                  on ? 'border-primary bg-primary/10' : 'border-border hover:border-slate-500'
                                }`}
                              >
                                <div className="text-sm font-semibold text-foreground">{a.label}</div>
                                {a.subOptions && (
                                  <div className="text-[11px] text-muted-foreground mt-0.5">
                                    {a.subOptions.join(' · ')}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {SUBSCRIPTION_PLANS.map((p) => (
                        <button
                          key={p.code}
                          type="button"
                          onClick={() => setSelectedPlan(p.code)}
                          className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col ${
                            selectedPlan === p.code
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-slate-500'
                          }`}
                        >
                          <div className="text-xs font-bold text-primary mb-1">{p.name}</div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-lg font-extrabold text-foreground">
                              {formatINR(p.offerPrice)}
                            </span>
                            <span className="text-[11px] text-muted-foreground line-through">
                              {formatINR(p.mrp)}
                            </span>
                          </div>
                          <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                            50% launch offer
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-1">
                            {p.offers} offers · {p.vouchers} vouchers
                          </div>
                          <ul className="mt-2 space-y-1">
                            {p.features.map((f, i) => (
                              <li key={i} className="flex items-start gap-1 text-[11px] text-muted-foreground">
                                <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between pt-6 border-t border-border">
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="h-11 px-5 bg-background border border-input text-muted-foreground rounded-xl cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <ArrowLeft className="h-4 w-4" /> Back
                      </span>
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowPayment(true)}
                      disabled={isHotel && !hotelStarRating}
                      className="rounded-xl h-11 px-6 font-semibold flex items-center gap-1.5 cursor-pointer text-[#D3DAD9]"
                    >
                      Proceed to Payment <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-emerald-400" />
                      Payment
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Scan the QR to pay, then upload a screenshot. We verify it and activate your listing.
                    </p>
                  </div>

                  {(() => {
                    const charge = computeHotelCharge(hotelStarRating, hotelAmenities);
                    const plan = getPlan(selectedPlan);
                    const amount = isHotel ? charge.total : plan?.offerPrice || 0;
                    return (
                      <div className="rounded-2xl border border-border p-5 space-y-3">
                        <h3 className="text-sm font-bold text-foreground">Your total</h3>
                        {isHotel ? (
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
                        ) : (
                          <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between text-muted-foreground">
                              <span>{plan?.name}</span>
                              <span className="line-through text-xs">{formatINR(plan?.mrp || 0)}</span>
                            </div>
                            <div className="flex justify-between text-emerald-400 text-xs font-semibold">
                              <span>50% launch offer applied</span>
                              <span>−{formatINR((plan?.mrp || 0) - (plan?.offerPrice || 0))}</span>
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between items-baseline border-t border-border pt-3">
                          <span className="text-sm font-bold text-foreground">Amount payable</span>
                          <span className="text-2xl font-extrabold text-foreground">{formatINR(amount)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Valid for {PLAN_DURATION_DAYS} days from activation.
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
                      <p className="text-[11px] text-muted-foreground mt-0.5">
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
                      <span className="text-[11px] text-muted-foreground">
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

                  <div className="flex justify-between pt-6 border-t border-border">
                    <Button
                      type="button"
                      onClick={() => setShowPayment(false)}
                      className="h-11 px-5 bg-background border border-input text-muted-foreground rounded-xl cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <ArrowLeft className="h-4 w-4" /> Back
                      </span>
                    </Button>
                    <Button
                      type="button"
                      onClick={handleBusinessFinalSubmit}
                      disabled={loading || !paymentProof}
                      className="rounded-xl h-11 px-6 font-semibold flex items-center gap-1.5 cursor-pointer text-[#D3DAD9]"
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
                </>
              )}
            </div>
          )}

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
