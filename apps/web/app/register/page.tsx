'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// mock-db removed — all registration flows through real API
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import { LegalFooter } from '@/components/common/legal-footer';
import { onboardingService, universalOnboardingService } from '@/lib/services/onboarding-service';
import { authService } from '@/lib/services/auth-service';
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
} from 'lucide-react';

type RegisterRole = 'CUSTOMER' | 'BUSINESS' | 'GOVERNMENT';

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
    slug: 'staycation',
    label: 'Staycation',
    subcategories: [
      { slug: 'hotels', label: 'Hotels' },
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
  const [referralCode, setReferralCode] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const [tenantId, setTenantId] = useState('');
  const [businessId, setBusinessId] = useState('');

  // Form states: Kerala Entity Profile details & Doc uploads (Step 4)
  // Locked to Thiruvananthapuram for Release 1 — multi-city UI hidden, DB architecture preserved
  const [district] = useState('Thiruvananthapuram');
  const [city] = useState('Thiruvananthapuram');
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
        // 1. Update business details (Step 2 and 3) — best-effort
        try {
          await onboardingService.updateStep(businessId, 2, {
            businessDescription: `Kerala based company ${companyName} operating in ${district}.`,
            subcategorySlugs: subcategorySlug ? [subcategorySlug] : [],
          });
        } catch (e) { console.warn('Step 2 update failed:', e); }

        try {
          await onboardingService.updateStep(businessId, 3, {
            address,
            city,
            state: 'Kerala',
            postalCode: '682001',
            district,
          });
        } catch (e) { console.warn('Step 3 update failed:', e); }

        // 2. Assign default subscription — best-effort
        try {
          await onboardingService.assignSubscription(businessId, 'LISTING_BASIC', 30);
        } catch (e) { console.warn('Subscription assign failed:', e); }

        // 3. Upload & Register Registration Certificate — best-effort
        try {
          const certData = await uploadFileToServer(certFile!);
          await onboardingService.registerDocument(businessId, {
            name: certFile!.name,
            documentType: 'REGISTRATION_CERTIFICATE',
            fileUrl: certData.fileUrl,
            fileKey: certData.fileKey,
            mimeType: certFile!.type,
            fileSize: certFile!.size,
          });
        } catch (e) { console.warn('Cert upload failed (continuing):', e); }

        // 4. Upload & Register Business Logo — best-effort
        try {
          const logoData = await uploadFileToServer(logoFile!);
          await onboardingService.registerMedia(businessId, {
            name: logoFile!.name,
            mediaType: 'LOGO',
            fileUrl: logoData.fileUrl,
            fileKey: logoData.fileKey,
            mimeType: logoFile!.type,
            fileSize: logoFile!.size,
          });
        } catch (e) { console.warn('Logo upload failed (continuing):', e); }

        // 5. Submit business verification request — CRITICAL, must run
        const submitRes = await onboardingService.submitForVerification(businessId);
        if (submitRes.error) {
          throw new Error(submitRes.error);
        }

        // Update local session status
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

        setSuccess('Company onboarding application successfully submitted!');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);

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
              Step {currentStep} of 3: {
                currentStep === 1 ? 'Choose Account Type' :
                currentStep === 2 ? 'Credentials & Setup' :
                'Profile & Documents'
              }
            </span>
          </div>
          <Progress value={(currentStep / 3) * 100} className="h-2 bg-background" />
          <div className="grid grid-cols-3 gap-2 mt-4 text-[10px] text-center font-mono">
            {['Account Type', 'Credentials', 'Profile Setup'].map((title, i) => (
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

              <div className="grid md:grid-cols-3 gap-4">
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
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = role === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setRole(item.type as RegisterRole)}
                      className={`p-6 rounded-2xl border text-left bg-gradient-to-b ${item.color} transition cursor-pointer flex flex-col gap-4 relative ${
                        isSelected ? 'border-white scale-[1.02] shadow-xl' : 'border-border'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className={`p-3 rounded-xl bg-background`}>
                          <Icon className={`h-6 w-6 ${item.iconColor}`} />
                        </div>
                        {isSelected && (
                          <span className="p-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                            <CheckCircle className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

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
                      {role === 'BUSINESS' ? 'Owner Full Name' : role === 'GOVERNMENT' ? 'Department Official Name' : 'Full Name'}
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
                {/* City locked to Thiruvananthapuram for Release 1 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">City / District</label>
                  <div className="flex items-center gap-2 h-11 px-3 rounded-xl border border-input bg-muted/30 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>Thiruvananthapuram, Kerala</span>
                    <span className="ml-auto text-[10px] text-muted-foreground/50 font-mono">Release 1</span>
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

              <div className="flex justify-end pt-6 border-t border-border">
                <Button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl h-11 px-6 font-semibold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition text-[#D3DAD9]" 
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      Submit Application <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
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
