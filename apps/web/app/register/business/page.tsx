'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { onboardingService, BusinessDraft } from '@/lib/services/onboarding-service';
import { optimizeImage } from '@/lib/utils/image-optimizer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Building2,
  FileText,
  MapPin,
  CreditCard,
  UploadCloud,
  CheckCircle,
  Loader2,
  Globe,
  Facebook,
  Instagram,
  Twitter,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

function RegisterBusinessWizardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const businessId = searchParams.get('id');

  // Loading & State variables
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [businessDraft, setBusinessDraft] = useState<BusinessDraft | null>(null);
  const [currentStep, setCurrentStep] = useState(2); // Start at Step 2 (Account was Step 1)

  // Step 2 Form States
  const [description, setDescription] = useState('');
  const [subcategorySlugs, setSubcategorySlugs] = useState<string[]>([]);

  // Step 3 Contact & Location States
  // City/state locked to Thiruvananthapuram for Release 1
  const [ownerName, setOwnerName] = useState('');
  const [address, setAddress] = useState('');
  const city = 'Thiruvananthapuram';
  const state = 'Kerala';
  const [postalCode, setPostalCode] = useState('');
  const [website, setWebsite] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');

  // Step 4 Subscription States
  const [selectedPlan, setSelectedPlan] = useState<'FREE' | 'LISTING_BASIC' | 'LISTING_PREMIUM'>(
    'LISTING_BASIC',
  );

  // Step 5 Document & Image Files States
  const [verificationDoc, setVerificationDoc] = useState<File | null>(null);
  const [verificationDocType, setVerificationDocType] = useState<
    'REGISTRATION_CERTIFICATE' | 'TAX_DOCUMENT' | 'UTILITY_BILL'
  >('REGISTRATION_CERTIFICATE');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const [docUploadProgress, setDocUploadProgress] = useState(0);
  const [logoUploadProgress, setLogoUploadProgress] = useState(0);
  const [bannerUploadProgress, setBannerUploadProgress] = useState(0);

  // Load draft progress on mount
  useEffect(() => {
    if (!businessId) {
      setError('Invalid Session. Business ID is missing in query params.');
      setLoading(false);
      return;
    }

    async function fetchProgress() {
      try {
        const response = await onboardingService.getProgress(businessId);
        if (response.data && !response.error) {
          const draft = response.data.business;
          setBusinessDraft(draft);
          setDescription(draft.description || '');
          setOwnerName(draft.ownerName || '');
          setAddress(draft.address || '');
          // city/state are locked to Thiruvananthapuram/Kerala for Release 1
          setPostalCode(draft.zipCode || '');
          setWebsite(draft.socialLinks?.website || '');
          setGoogleMapsUrl(draft.socialLinks?.googleMapsUrl || '');
          setFacebook(draft.socialLinks?.facebook || '');
          setInstagram(draft.socialLinks?.instagram || '');
          setTwitter(draft.socialLinks?.twitter || '');

          // Map backend steps completed
          const stepsCompleted = response.data.onboardingProgress?.stepsCompleted || [];
          if (stepsCompleted.includes('STEP_5')) {
            setCurrentStep(6);
          } else if (stepsCompleted.includes('STEP_4')) {
            setCurrentStep(5);
          } else if (stepsCompleted.includes('STEP_3')) {
            setCurrentStep(4);
          } else if (stepsCompleted.includes('STEP_2')) {
            setCurrentStep(3);
          }
        } else {
          setError(response.error || 'Failed to fetch business onboarding details.');
        }
      } catch (err: any) {
        setError(err.message || 'Error occurred while loading draft.');
      } finally {
        setLoading(false);
      }
    }

    fetchProgress();
  }, [businessId]);

  // Navigate back
  const handleBack = () => {
    if (currentStep > 2) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Submit Step 2 (Description & Subcategories)
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setError('');
    setSubmitting(true);

    try {
      const response = await onboardingService.updateStep(businessId, 2, {
        businessDescription: description,
        subcategorySlugs: subcategorySlugs.length ? subcategorySlugs : ['cafes'],
      });

      if (response.data && !response.error) {
        setCurrentStep(3);
      } else {
        setError(response.error || 'Failed to update step 2.');
      }
    } catch (err: any) {
      setError(err.message || 'Error updating step 2.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Step 3 (Contact & Location details)
  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setError('');
    setSubmitting(true);

    const socialLinks = {
      facebook,
      instagram,
      twitter,
      website,
      googleMapsUrl,
    };

    try {
      const response = await onboardingService.updateStep(businessId, 3, {
        ownerName,
        address,
        city,
        state,
        postalCode,
        businessWebsite: website,
        googleMapsUrl,
        socialLinks,
      });

      if (response.data && !response.error) {
        setCurrentStep(4);
      } else {
        setError(response.error || 'Failed to update step 3.');
      }
    } catch (err: any) {
      setError(err.message || 'Error updating step 3.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Step 4 (Subscription Plan selection)
  const handleStep4Submit = async () => {
    if (!businessId) return;
    setError('');
    setSubmitting(true);

    try {
      const response = await onboardingService.assignSubscription(businessId, selectedPlan, 30);
      if (response.data && !response.error) {
        setCurrentStep(5);
      } else {
        setError(response.error || 'Failed to assign package.');
      }
    } catch (err: any) {
      setError(err.message || 'Error selecting subscription package.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper file uploader
  const uploadAndRegister = async (
    file: File,
    type: 'DOC' | 'LOGO' | 'BANNER',
    progressCallback: (prog: number) => void,
  ) => {
    if (!businessId) return null;
    progressCallback(10);

    let fileToUpload = file;
    if (type === 'LOGO' || type === 'BANNER') {
      try {
        fileToUpload = await optimizeImage(file, { quality: 0.8 });
      } catch (err) {
        console.error('Image optimization failed, using original file:', err);
      }
    }

    let uploadUrl = '';
    let fileKey = '';

    if (type === 'DOC') {
      // 1. Get signed upload URL and register in BusinessDocument table at once
      const docRes = await onboardingService.getBusinessDocumentUploadUrl(businessId, {
        documentType: verificationDocType || 'BUSINESS_REGISTRATION_PROOF',
        filename: fileToUpload.name,
        mimeType: fileToUpload.type,
      });

      if (!docRes.data || docRes.error) {
        throw new Error(docRes.error || `Failed to fetch upload URL for ${fileToUpload.name}`);
      }
      uploadUrl = docRes.data.uploadUrl;
      fileKey = docRes.data.fileKey;
    } else {
      // 1. Get signed upload URL for media (LOGO/BANNER)
      const category = type === 'LOGO' ? 'logo' : 'banner';
      const signedRes = await onboardingService.getSignedUrl(businessId, fileToUpload.name, fileToUpload.type, category);
      if (!signedRes.data || signedRes.error) {
        throw new Error(signedRes.error || `Failed to fetch upload URL for ${fileToUpload.name}`);
      }
      uploadUrl = signedRes.data.uploadUrl;
      fileKey = signedRes.data.fileKey;
    }

    progressCallback(30);

    // 2. Upload file content directly to Supabase Storage
    const uploadSuccess = await onboardingService.uploadFile(uploadUrl, fileToUpload);
    if (!uploadSuccess) {
      throw new Error(`Failed to transmit file payload for ${fileToUpload.name}`);
    }
    progressCallback(60);

    // 3. For LOGO/BANNER, register with backend DB (DOC is already registered as PENDING)
    if (type !== 'DOC') {
      const dbUrl = JSON.stringify({ bucket: 'business-media', path: fileKey });
      const regRes = await onboardingService.registerMedia(businessId, {
        name: fileToUpload.name,
        mediaType: type,
        fileUrl: dbUrl,
        fileKey,
        mimeType: fileToUpload.type,
        fileSize: fileToUpload.size,
      });

      if (regRes.error) {
        throw new Error(regRes.error || `Registration failed for ${fileToUpload.name}`);
      }
    }

    progressCallback(100);
    return true;
  };

  // Submit Step 5 (Uploading files & Proceeding to Review)
  const handleStep5Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    if (!verificationDoc || !logoFile || !bannerFile) {
      setError('You must provide all three requested files for onboarding verification.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      // Perform uploads sequentially or in parallel
      setDocUploadProgress(0);
      setLogoUploadProgress(0);
      setBannerUploadProgress(0);

      // Upload Doc
      await uploadAndRegister(verificationDoc, 'DOC', setDocUploadProgress);
      // Upload Logo
      await uploadAndRegister(logoFile, 'LOGO', setLogoUploadProgress);
      // Upload Banner
      await uploadAndRegister(bannerFile, 'BANNER', setBannerUploadProgress);

      // Trigger Step 5 step completed marker in backend
      const progressSave = await onboardingService.updateStep(businessId, 5, {});
      if (progressSave.data && !progressSave.error) {
        setCurrentStep(6);
      } else {
        setError(progressSave.error || 'Failed to update step 5 verification progress.');
      }
    } catch (err: any) {
      setError(err.message || 'File upload pipeline encountered a verification failure.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Step 6 (Final Onboarding Submit)
  const handleFinalSubmit = async () => {
    if (!businessId) return;
    setError('');
    setSubmitting(true);

    try {
      const response = await onboardingService.submitForVerification(businessId);
      if (response.data && !response.error) {
        setSuccess('Application successfully submitted! Redirecting to Restricted Dashboard...');
        
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

        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setError(response.error || 'Failed to submit application.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred during final submission.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-violet-400 animate-spin mb-4" />
        <p className="text-muted-foreground text-sm">Loading onboarding draft status...</p>
      </div>
    );
  }

  // Common UI details
  const stepTitles = [
    'Create Account',
    'Description',
    'Location & Contacts',
    'Pricing Package',
    'Identity Uploads',
    'Review Submission',
  ];

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-600/5 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        {/* Header branding */}
        <div className="text-center space-y-2">
          <Building2 className="h-12 w-12 text-cyan-400 mx-auto" />
          <h1 className="text-foregroundxl md:text-4xl font-extrabold tracking-tight">
            Business Partner Setup
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {businessDraft ? `Registering ${businessDraft.name}` : 'Setup your Whtzup.city Business Profile'}
          </p>
        </div>

        {/* Wizard Step Tracker bar */}
        <div className="w-full p-4 rounded-2xl" >
          <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground mb-3 px-2">
            <span>Progress Status</span>
            <span className="text-cyan-400">
              Step {currentStep} of 6: {stepTitles[currentStep - 1]}
            </span>
          </div>
          <Progress value={(currentStep / 6) * 100} className="h-2 bg-background" />
          <div className="grid grid-cols-6 gap-2 mt-4 text-[10px] text-center font-mono">
            {stepTitles.map((title, i) => (
              <span
                key={i}
                className={
                  i + 1 < currentStep
                    ? 'text-emerald-400 font-bold'
                    : i + 1 === currentStep
                      ? 'text-cyan-400 font-bold border-b border-cyan-500 pb-1'
                      : 'text-muted-foreground/50'
                }
              >
                Step {i + 1}
              </span>
            ))}
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Global Success Banner */}
        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Wizard Card contents */}
        <Card className="bg-card/80 backdrop-blur-xl border border-border p-6 md:p-8 rounded-3xl shadow-xl">
          {/* STEP 2: Description details */}
          {currentStep === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-violet-400" />
                  Tell Us About Your Business
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Give discovery directory browsers a summary of your products and expertise.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Detailed Description</label>
                <Textarea
                  placeholder="Sunrise Cafe serves hand-roasted organic coffee, fresh artisanal breads, and locally-sourced breakfast items in a cozy, community-focused space..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-36 bg-background border-input text-foreground placeholder-slate-500 focus:border-violet-500 rounded-xl leading-relaxed text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Subcategories / Tags (Select all that apply)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { slug: 'cafes', label: 'Cafes & Bakeries' },
                    { slug: 'fastfood', label: 'Fast Food / Diners' },
                    { slug: 'organic', label: 'Organic / Healthy' },
                    { slug: 'delivery', label: 'Local Delivery' },
                    { slug: 'handcrafted', label: 'Artisanal / Handcrafted' },
                    { slug: 'family', label: 'Family Friendly' },
                  ].map((sub) => (
                    <button
                      type="button"
                      key={sub.slug}
                      onClick={() => {
                        if (subcategorySlugs.includes(sub.slug)) {
                          setSubcategorySlugs(subcategorySlugs.filter((s) => s !== sub.slug));
                        } else {
                          setSubcategorySlugs([...subcategorySlugs, sub.slug]);
                        }
                      }}
                      className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                        subcategorySlugs.includes(sub.slug)
                          ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                          : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 px-6 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-1.5">
                      Save & Continue
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* STEP 3: Location & Contacts */}
          {currentStep === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-cyan-400" />
                  Location & Contacts
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Provide physical location and digital contact directories.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Owner Name</label>
                  <Input
                    placeholder="e.g. Priya Menon"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="h-11 bg-background border-input text-sm text-foreground rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Street Address</label>
                  <Input
                    placeholder="123 Ocean Blvd, Suite B"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="h-11 bg-background border-input text-sm text-foreground rounded-xl"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* City/State locked to Thiruvananthapuram, Kerala for Release 1 */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">City / District</label>
                    <div className="flex items-center h-11 px-3 rounded-xl border border-input bg-muted/30 text-sm text-muted-foreground">
                      Thiruvananthapuram, Kerala
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Postal Code</label>
                    <Input
                      placeholder="e.g. 695001"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="h-11 bg-background border-input text-sm text-foreground rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Website URL (Optional)
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="url"
                        placeholder="https://sunrisecafe.com"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="pl-10 h-11 bg-background border-input text-sm text-foreground rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Google Maps URL (Optional)
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="url"
                        placeholder="https://maps.google.com/..."
                        value={googleMapsUrl}
                        onChange={(e) => setGoogleMapsUrl(e.target.value)}
                        className="pl-10 h-11 bg-background border-input text-sm text-foreground rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-3">
                    Social Directories
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative">
                      <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
                      <Input
                        placeholder="Facebook Username"
                        value={facebook}
                        onChange={(e) => setFacebook(e.target.value)}
                        className="pl-10 h-11 bg-background border-input text-xs text-foreground rounded-xl"
                      />
                    </div>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-400" />
                      <Input
                        placeholder="Instagram Username"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        className="pl-10 h-11 bg-background border-input text-xs text-foreground rounded-xl"
                      />
                    </div>
                    <div className="relative">
                      <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-400" />
                      <Input
                        placeholder="Twitter Handle"
                        value={twitter}
                        onChange={(e) => setTwitter(e.target.value)}
                        className="pl-10 h-11 bg-background border-input text-xs text-foreground rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  onClick={handleBack}
                  className="h-11 px-5 bg-background border border-input text-muted-foreground rounded-xl cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </span>
                </Button>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 px-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-semibold cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-1.5">
                      Save & Continue
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* STEP 4: Choose Subscription Package */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-indigo-400" />
                  Select Catalog Package
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Select a subscription package. You won't be charged during verification
                  onboarding.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {[
                  {
                    code: 'FREE',
                    name: 'Free Basic',
                    price: '$0',
                    features: [
                      'Single listing item',
                      'Basic contact details',
                      'Standard phone listing',
                    ],
                    border: 'border-border hover:border-slate-500',
                    badge: 'bg-slate-500/10 text-muted-foreground',
                  },
                  {
                    code: 'LISTING_BASIC',
                    name: 'Enterprise Basic',
                    price: '$29/mo',
                    features: [
                      'Priority search indexing',
                      'R2 Gallery uploads',
                      'Verified Business Badge',
                      'Customer Reviews feed',
                    ],
                    border: 'border-cyan-500/30 shadow-cyan-500/5 hover:border-cyan-500',
                    badge: 'bg-cyan-500/10 text-cyan-400',
                  },
                  {
                    code: 'LISTING_PREMIUM',
                    name: 'Premium Growth',
                    price: '$99/mo',
                    features: [
                      'All Basic features',
                      'Live promotions & deals',
                      'Advanced visitor metrics',
                      'Platform priority push',
                    ],
                    border: 'border-violet-500/30 shadow-violet-500/5 hover:border-violet-500',
                    badge: 'bg-violet-500/10 text-violet-400',
                  },
                ].map((plan) => (
                  <button
                    key={plan.code}
                    onClick={() => setSelectedPlan(plan.code as any)}
                    className={`p-5 rounded-2xl border bg-white/[0.01] text-left transition duration-300 relative flex flex-col justify-between h-[340px] cursor-pointer ${
                      selectedPlan === plan.code
                        ? 'bg-white/[0.04] border-2 border-white shadow-xl scale-[1.02]'
                        : plan.border
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${plan.badge}`}
                        >
                          {plan.name}
                        </span>
                      </div>
                      <h4 className="text-foregroundxl font-extrabold text-white mb-2">{plan.price}</h4>
                      <ul className="space-y-2 mt-4 text-[11px] text-muted-foreground leading-relaxed">
                        {plan.features.map((f, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {selectedPlan === plan.code && (
                      <span className="text-xs font-bold text-emerald-400 self-end">Selected</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  onClick={handleBack}
                  className="h-11 px-5 bg-background border border-input text-muted-foreground rounded-xl cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </span>
                </Button>

                <Button
                  type="button"
                  onClick={handleStep4Submit}
                  disabled={submitting}
                  className="h-11 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-1.5">
                      Save & Continue
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: Identity & Media Uploads */}
          {currentStep === 5 && (
            <form onSubmit={handleStep5Submit} className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-violet-400" />
                  Verification Documents & Branding
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload verification documents to complete verification onboarding.
                </p>
              </div>

              <div className="space-y-5">
                {/* Document selector */}
                <div className="p-5 rounded-2xl bg-muted/30 border border-border space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-foreground">
                      1. Verification Document
                    </label>
                    <select
                      value={verificationDocType}
                      onChange={(e) => setVerificationDocType(e.target.value as any)}
                      className="bg-background border border-input text-muted-foreground rounded-lg text-xs p-1 focus:outline-none cursor-pointer"
                    >
                      <option value="REGISTRATION_CERTIFICATE" className="bg-[#0f0f13]">
                        Registration Certificate
                      </option>
                      <option value="TAX_DOCUMENT" className="bg-[#0f0f13]">
                        Tax Document / EIN
                      </option>
                      <option value="UTILITY_BILL" className="bg-[#0f0f13]">
                        Utility Bill Proof
                      </option>
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setVerificationDoc(e.target.files?.[0] || null)}
                        className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-violet-600/20 file:text-violet-300 file:cursor-pointer hover:file:bg-violet-600/30"
                        required
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Accepts PDF, JPG, PNG (Max 5MB)
                      </p>
                    </div>
                    {docUploadProgress > 0 && (
                      <div className="w-24 space-y-1">
                        <Progress value={docUploadProgress} className="h-1 bg-background" />
                        <p className="text-[9px] text-center font-mono text-cyan-400">
                          {docUploadProgress}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Logo Upload */}
                <div className="p-5 rounded-2xl bg-muted/30 border border-border space-y-4">
                  <label className="text-sm font-semibold text-foreground block">
                    2. Brand Logo Image
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-600/20 file:text-cyan-300 file:cursor-pointer hover:file:bg-cyan-600/30"
                        required
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Square image, recommended 512x512 PNG/JPG
                      </p>
                    </div>
                    {logoUploadProgress > 0 && (
                      <div className="w-24 space-y-1">
                        <Progress value={logoUploadProgress} className="h-1 bg-background" />
                        <p className="text-[9px] text-center font-mono text-cyan-400">
                          {logoUploadProgress}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Banner Upload */}
                <div className="p-5 rounded-2xl bg-muted/30 border border-border space-y-4">
                  <label className="text-sm font-semibold text-foreground block">
                    3. Cover/Banner Image
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600/20 file:text-indigo-300 file:cursor-pointer hover:file:bg-indigo-600/30"
                        required
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Wide landscape cover image, recommended 1200x480 PNG/JPG
                      </p>
                    </div>
                    {bannerUploadProgress > 0 && (
                      <div className="w-24 space-y-1">
                        <Progress value={bannerUploadProgress} className="h-1 bg-background" />
                        <p className="text-[9px] text-center font-mono text-cyan-400">
                          {bannerUploadProgress}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  onClick={handleBack}
                  className="h-11 px-5 bg-background border border-input text-muted-foreground rounded-xl cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </span>
                </Button>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 px-6 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold cursor-pointer"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading Files...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      Transmit Uploads
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* STEP 6: Review & Final Submission */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <FileCheck className="h-12 w-12 text-emerald-400 mx-auto" />
                <h3 className="text-xl font-bold text-foreground">Review Application</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Verify your profile details before submitting for official verification.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-muted/30 border border-border space-y-3 text-xs">
                <div className="grid grid-cols-3 py-1 border-b border-border">
                  <span className="text-muted-foreground font-semibold">Business Name</span>
                  <span className="col-span-2 text-foreground">{businessDraft?.name}</span>
                </div>
                <div className="grid grid-cols-3 py-1 border-b border-border">
                  <span className="text-muted-foreground font-semibold">Business Description</span>
                  <span className="col-span-2 text-foreground line-clamp-3 leading-relaxed">
                    {description}
                  </span>
                </div>
                <div className="grid grid-cols-3 py-1 border-b border-border">
                  <span className="text-muted-foreground font-semibold">Street Address</span>
                  <span className="col-span-2 text-foreground">
                    {address}, {city}, {state} {postalCode}
                  </span>
                </div>
                <div className="grid grid-cols-3 py-1 border-b border-border">
                  <span className="text-muted-foreground font-semibold">Pricing Tier</span>
                  <span className="col-span-2 text-cyan-400 font-bold">{selectedPlan}</span>
                </div>
                <div className="grid grid-cols-3 py-1">
                  <span className="text-muted-foreground font-semibold">Verification Proofs</span>
                  <span className="col-span-2 text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    All required assets uploaded successfully
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-violet-600/10 border border-violet-500/20 text-muted-foreground text-xs leading-relaxed flex gap-3">
                <ShieldCheck className="h-5 w-5 text-violet-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Legal Notice:</strong> By submitting, you certify that all information and
                  uploaded license files are authentic. Platform moderators review all registration
                  requests within 24-48 business hours.
                </span>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  onClick={handleBack}
                  className="h-11 px-5 bg-background border border-input text-muted-foreground rounded-xl cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </span>
                </Button>

                <Button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={submitting}
                  className="h-11 px-8 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold cursor-pointer hover:opacity-90"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    'Submit Verification Request'
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function RegisterBusinessWizard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 text-violet-400 animate-spin mb-4" />
          <p className="text-muted-foreground text-sm">Loading session wizard...</p>
        </div>
      }
    >
      <RegisterBusinessWizardContent />
    </Suspense>
  );
}
