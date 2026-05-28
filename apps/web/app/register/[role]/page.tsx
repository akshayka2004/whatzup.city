'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { universalOnboardingService, EntityOnboardingProgress } from '@/lib/services/onboarding-service';
import { onboardingService } from '@/lib/services/onboarding-service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  User as UserIcon,
  Building2,
  Sparkles,
  Briefcase,
  Calendar,
  Heart,
  ShieldAlert,
  Loader2,
  UploadCloud,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  FileCheck,
  AlertCircle,
  DollarSign,
  Plus,
  Trash2,
  Globe,
} from 'lucide-react';

export default function RoleOnboardingWizard() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const role = params.role as string; // 'influencer' | 'professional' | 'event-organizer' | 'ngo' | 'government'
  const entityId = searchParams.get('id');

  // Loading & State variables
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [entityData, setEntityData] = useState<any>(null);
  const [onboardingProgress, setOnboardingProgress] = useState<EntityOnboardingProgress | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  // Form States — Dynamic based on role
  // 1. Influencer
  const [niche, setNiche] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [facebook, setFacebook] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [followersCount, setFollowersCount] = useState(0);
  const [engagementRate, setEngagementRate] = useState(0);
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [mediaKitUrl, setMediaKitUrl] = useState('');

  // 2. Professional
  const [category, setCategory] = useState('');
  const [experienceYears, setExperienceYears] = useState(0);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCert, setNewCert] = useState('');
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [newArea, setNewArea] = useState('');
  const [pricingMin, setPricingMin] = useState(0);
  const [pricingMax, setPricingMax] = useState(0);
  const [availability, setAvailability] = useState<Record<string, string>>({
    monday: '9am - 5pm',
    tuesday: '9am - 5pm',
    wednesday: '9am - 5pm',
    thursday: '9am - 5pm',
    friday: '9am - 5pm',
  });

  // 3. Event Organizer
  const [organizationName, setOrganizationName] = useState('');
  const [eventCategories, setEventCategories] = useState<string[]>([]);
  const [newEvCat, setNewEvCat] = useState('');
  const [venuePartnerships, setVenuePartnerships] = useState<string[]>([]);
  const [newVenue, setNewVenue] = useState('');
  const [ticketingSupport, setTicketingSupport] = useState(false);
  const [website, setWebsite] = useState('');
  const [facebookLink, setFacebookLink] = useState('');
  const [instagramLink, setInstagramLink] = useState('');
  const [twitterLink, setTwitterLink] = useState('');
  const [previousEvents, setPreviousEvents] = useState<any[]>([]);
  const [newEvName, setNewEvName] = useState('');
  const [newEvDate, setNewEvDate] = useState('');
  const [newEvDesc, setNewEvDesc] = useState('');

  // 4. NGO / Organization
  const [ngoName, setNgoName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [causeCategory, setCauseCategory] = useState('');
  const [operationalAreas, setOperationalAreas] = useState<string[]>([]);
  const [newOpArea, setNewOpArea] = useState('');

  // 5. Government
  const [departmentName, setDepartmentName] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [departmentType, setDepartmentType] = useState('Local');
  const [district, setDistrict] = useState('');

  // 6. Generic Verification Upload
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [verificationDoc, setVerificationDoc] = useState<File | null>(null);
  const [docTypeLabel, setDocTypeLabel] = useState('ID Proof / Government Certificate');
  const [docNumber, setDocNumber] = useState('');
  const [issuedAuthority, setIssuedAuthority] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Validate the route role parameter
  const validRoles = ['influencer', 'professional', 'event-organizer', 'ngo', 'government'];
  const isValidRole = validRoles.includes(role);

  // Load progress
  useEffect(() => {
    if (!isValidRole || !entityId) {
      setError('Invalid Onboarding URL Session.');
      setLoading(false);
      return;
    }

    async function loadProgress() {
      try {
        const res = await universalOnboardingService.getProgress(entityId);
        if (res.data && !res.error) {
          const entity = res.data.entity;
          const progress = res.data.onboardingProgress;

          setEntityData(entity);
          setOnboardingProgress(progress);

          // Pre-populate fields based on active profile details
          if (role === 'influencer' && entity.influencerProfile) {
            const p = entity.influencerProfile;
            setNiche(p.niche || '');
            setInstagram(p.instagram || '');
            setYoutube(p.youtube || '');
            setFacebook(p.facebook || '');
            setLinkedin(p.linkedin || '');
            setFollowersCount(p.followersCount || 0);
            setEngagementRate(p.engagementRate || 0);
            setPortfolioUrl(p.portfolioUrl || '');
            setMediaKitUrl(p.mediaKitUrl || '');
          } else if (role === 'professional' && entity.professionalProfile) {
            const p = entity.professionalProfile;
            setCategory(p.category || '');
            setExperienceYears(p.experienceYears || 0);
            setCertifications(p.certifications || []);
            setServiceAreas(p.serviceAreas || []);
            setPricingMin(p.pricingMin || 0);
            setPricingMax(p.pricingMax || 0);
            if (p.availability) setAvailability(p.availability);
          } else if (role === 'event-organizer' && entity.eventOrganizerProfile) {
            const p = entity.eventOrganizerProfile;
            setOrganizationName(p.organizationName || entity.name || '');
            setEventCategories(p.eventCategories || []);
            setVenuePartnerships(p.venuePartnerships || []);
            setTicketingSupport(p.ticketingSupport || false);
            setWebsite(p.website || '');
            if (p.socialLinks) {
              setFacebookLink(p.socialLinks.facebook || '');
              setInstagramLink(p.socialLinks.instagram || '');
              setTwitterLink(p.socialLinks.twitter || '');
            }
            setPreviousEvents(p.previousEvents || []);
          } else if (role === 'ngo' && entity.organizationProfile) {
            const p = entity.organizationProfile;
            setNgoName(p.ngoName || entity.name || '');
            setRegistrationNumber(p.registrationNumber || '');
            setCauseCategory(p.causeCategory || '');
            setOperationalAreas(p.operationalAreas || []);
            setWebsite(p.website || '');
          } else if (role === 'government' && entity.governmentProfile) {
            const p = entity.governmentProfile;
            setDepartmentName(p.departmentName || entity.name || '');
            setOfficialEmail(p.officialEmail || entity.email || '');
            setDepartmentType(p.departmentType || 'Local');
            setDistrict(p.district || '');
          }

          // Load documents
          const docRes = await universalOnboardingService.getDocuments(entityId);
          if (docRes.data) {
            setUploadedDocs(docRes.data);
          }

          // Map completed steps to wizard index
          const stepsCompleted = progress?.stepsCompleted || [];
          if (stepsCompleted.includes('STEP_3')) {
            setCurrentStep(4);
          } else if (stepsCompleted.includes('STEP_2')) {
            setCurrentStep(3);
          } else if (stepsCompleted.includes('STEP_1')) {
            setCurrentStep(2);
          }
        } else {
          setError(res.error || 'Failed to retrieve onboarding details.');
        }
      } catch (err: any) {
        setError(err.message || 'Error occurred while loading onboarding details.');
      } finally {
        setLoading(false);
      }
    }

    loadProgress();
  }, [entityId, role, isValidRole]);

  if (!isValidRole) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <ShieldAlert className="h-12 w-12 text-rose-500 mb-4 animate-bounce" />
        <h1 className="text-2xl font-bold">Invalid Onboarding Role</h1>
        <p className="text-muted-foreground text-sm mt-2 text-center max-w-sm">
          The requested onboarding role parameter is invalid. Please return to selection panel.
        </p>
        <Button onClick={() => router.push('/register/select-role')} className="mt-6 bg-violet-600">
          Go to Selector
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-cyan-400 animate-spin mb-4" />
        <p className="text-muted-foreground text-sm">Synchronizing onboarding session...</p>
      </div>
    );
  }

  // Dynamic step titles mapping
  const stepConfig: Record<string, { steps: string[]; icons: React.ComponentType<any>[] }> = {
    influencer: {
      steps: ['Identity Profiles', 'Audience Insights', 'Media Kit Showcase', 'Verification Documents'],
      icons: [UserIcon, Sparkles, Briefcase, UploadCloud],
    },
    professional: {
      steps: ['Expert Details', 'Services & Rates', 'Availability Hours', 'Professional Credentials'],
      icons: [Briefcase, DollarSign, Calendar, UploadCloud],
    },
    'event-organizer': {
      steps: ['Organization Profile', 'Focus Categories', 'Event Showcase', 'Brochures Upload'],
      icons: [Building2, Sparkles, Calendar, UploadCloud],
    },
    ngo: {
      steps: ['NGO Information', 'Causes & Regions', 'Registration Credentials'],
      icons: [Heart, Sparkles, UploadCloud],
    },
    government: {
      steps: ['Department Profile', 'Administrative Coverage', 'Official Authority Letter'],
      icons: [Building2, ShieldAlert, UploadCloud],
    },
  };

  const currentRoleConfig = stepConfig[role];
  const totalSteps = currentRoleConfig.steps.length;

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  // Submit Step Data to NestJS
  const handleStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityId) return;

    setError('');
    setSubmitting(true);

    let payload: any = {};

    if (role === 'influencer') {
      if (currentStep === 1) {
        payload = { niche, instagram, youtube, facebook, linkedin };
      } else if (currentStep === 2) {
        payload = { followersCount: Number(followersCount), engagementRate: Number(engagementRate) };
      } else if (currentStep === 3) {
        payload = { portfolioUrl, mediaKitUrl };
      }
    } else if (role === 'professional') {
      if (currentStep === 1) {
        payload = { category, experienceYears: Number(experienceYears), certifications };
      } else if (currentStep === 2) {
        payload = { serviceAreas, pricingMin: Number(pricingMin), pricingMax: Number(pricingMax) };
      } else if (currentStep === 3) {
        payload = { availability };
      }
    } else if (role === 'event-organizer') {
      if (currentStep === 1) {
        payload = {
          organizationName,
          website,
          socialLinks: { facebook: facebookLink, instagram: instagramLink, twitter: twitterLink },
        };
      } else if (currentStep === 2) {
        payload = { eventCategories, venuePartnerships, ticketingSupport };
      } else if (currentStep === 3) {
        payload = { previousEvents };
      }
    } else if (role === 'ngo') {
      if (currentStep === 1) {
        payload = { ngoName, registrationNumber, website };
      } else if (currentStep === 2) {
        payload = { causeCategory, operationalAreas };
      }
    } else if (role === 'government') {
      if (currentStep === 1) {
        payload = { departmentName, officialEmail, departmentType };
      } else if (currentStep === 2) {
        payload = { district };
      }
    }

    try {
      const response = await universalOnboardingService.updateStep(entityId, currentStep, payload);
      if (response.data && !response.error) {
        // Proceed
        setCurrentStep(currentStep + 1);
      } else {
        setError(response.error || `Failed to save step ${currentStep} progress.`);
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while saving profile details.');
    } finally {
      setSubmitting(false);
    }
  };

  // Upload document handler
  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityId || !verificationDoc) return;

    setError('');
    setSubmitting(true);
    setUploadProgress(10);

    try {
      // 1. Fetch pre-signed url from universal module
      const presign = await universalOnboardingService.getSignedUrl(
        entityId,
        verificationDoc.name,
        verificationDoc.type,
      );

      if (!presign.data || presign.error) {
        throw new Error(presign.error || 'Failed to generate sign upload URL.');
      }
      setUploadProgress(40);

      const { uploadUrl, fileKey } = presign.data;

      // 2. Put file payload
      const uploadSuccess = await onboardingService.uploadFile(uploadUrl, verificationDoc);
      if (!uploadSuccess) {
        throw new Error('Cloud storage connection rejected file payload.');
      }
      setUploadProgress(70);

      // Build url
      const finalUrl = uploadUrl.startsWith('/')
        ? uploadUrl.split('?')[0]
        : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'saas-uploads'}/${fileKey}`;

      // 3. Save to database
      const saveRes = await universalOnboardingService.registerDocument(entityId, {
        documentType: docTypeLabel,
        fileUrl: finalUrl,
        documentNumber: docNumber || undefined,
        issuedAuthority: issuedAuthority || undefined,
        filename: verificationDoc.name,
        mimeType: verificationDoc.type,
      });

      if (saveRes.error) {
        throw new Error(saveRes.error);
      }

      setUploadProgress(100);
      setSuccess('Verification document registered successfully!');

      // Reload document lists
      const docRes = await universalOnboardingService.getDocuments(entityId);
      if (docRes.data) {
        setUploadedDocs(docRes.data);
      }

      // Reset file input fields
      setVerificationDoc(null);
      setDocNumber('');
      setIssuedAuthority('');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message || 'File upload pipeline encountered a processing failure.');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  // Delete uploaded document
  const handleDeleteDoc = async (docId: string) => {
    if (!entityId) return;
    try {
      await universalOnboardingService.deleteDocument(entityId, docId);
      setUploadedDocs(uploadedDocs.filter((d) => d.id !== docId));
    } catch (err: any) {
      setError(err.message || 'Failed to remove document.');
    }
  };

  // Final verification submit
  const handleFinalSubmit = async () => {
    if (!entityId) return;
    if (uploadedDocs.length === 0) {
      setError('You must upload at least one verified file / document.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const response = await universalOnboardingService.submitForVerification(entityId);
      if (response.data && !response.error) {
        setSuccess('Application successfully submitted! Redirecting to Restricted Dashboard...');
        
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

        setTimeout(() => {
          if (role === 'government') {
            router.push('/government/dashboard');
          } else {
            router.push('/dashboard');
          }
        }, 2000);
      } else {
        setError(response.error || 'Failed to submit onboarding application.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred during final verification submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const ActiveStepIcon = currentRoleConfig.icons[currentStep - 1] || UserIcon;

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-600/5 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        {/* Header Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            {role.replace('-', ' ')} Onboarding
          </div>
          <h1 className="text-foregroundxl md:text-4xl font-extrabold tracking-tight">
            Verification & Setup Wizard
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Completing setup for {entityData?.name || 'your profile'}
          </p>
        </div>

        {/* Step tracker */}
        <div className="w-full p-4 rounded-2xl" >
          <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground mb-3 px-2">
            <span>Progress Status</span>
            <span className="text-cyan-400">
              Step {currentStep} of {totalSteps}: {currentRoleConfig.steps[currentStep - 1]}
            </span>
          </div>
          <Progress value={(currentStep / totalSteps) * 100} className="h-2 bg-background" />
          <div className="grid grid-cols-4 gap-2 mt-4 text-[10px] text-center font-mono">
            {currentRoleConfig.steps.map((title, i) => (
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

        <Card className="bg-card/80 backdrop-blur-xl border border-border p-6 md:p-8 rounded-3xl shadow-xl">
          {/* Dynamically render step form */}
          {currentStep < totalSteps ? (
            <form onSubmit={handleStepSubmit} className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <ActiveStepIcon className="h-5 w-5 text-violet-400 animate-pulse" />
                  {currentRoleConfig.steps[currentStep - 1]}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Fill in details below to customize your specialized credentials.
                </p>
              </div>

              <div className="space-y-4">
                {/* 1. INFLUENCER FORM */}
                {role === 'influencer' && currentStep === 1 && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Niche Category</label>
                      <Input
                        placeholder="Fashion, Tech, Food, Travel, Gaming"
                        value={niche}
                        onChange={(e) => setNiche(e.target.value)}
                        className="bg-background border-input text-sm rounded-xl"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Instagram Handle</label>
                        <Input
                          placeholder="@myhandle"
                          value={instagram}
                          onChange={(e) => setInstagram(e.target.value)}
                          className="bg-background border-input text-sm rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">YouTube Channel URL</label>
                        <Input
                          placeholder="youtube.com/c/channel"
                          value={youtube}
                          onChange={(e) => setYoutube(e.target.value)}
                          className="bg-background border-input text-sm rounded-xl"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Facebook Page link</label>
                        <Input
                          placeholder="facebook.com/page"
                          value={facebook}
                          onChange={(e) => setFacebook(e.target.value)}
                          className="bg-background border-input text-sm rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">LinkedIn Profile link</label>
                        <Input
                          placeholder="linkedin.com/in/profile"
                          value={linkedin}
                          onChange={(e) => setLinkedin(e.target.value)}
                          className="bg-background border-input text-sm rounded-xl"
                        />
                      </div>
                    </div>
                  </>
                )}

                {role === 'influencer' && currentStep === 2 && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Total Followers Count</label>
                        <Input
                          type="number"
                          placeholder="15000"
                          value={followersCount}
                          onChange={(e) => setFollowersCount(Number(e.target.value))}
                          className="bg-background border-input text-sm rounded-xl"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Engagement Rate (%)</label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="3.2"
                          value={engagementRate}
                          onChange={(e) => setEngagementRate(Number(e.target.value))}
                          className="bg-background border-input text-sm rounded-xl"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {role === 'influencer' && currentStep === 3 && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Portfolio Website URL</label>
                      <Input
                        placeholder="https://myportfolio.com"
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                        className="bg-background border-input text-sm rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Media Kit PDF Link (Optional)</label>
                      <Input
                        placeholder="https://drive.google.com/mediakit.pdf"
                        value={mediaKitUrl}
                        onChange={(e) => setMediaKitUrl(e.target.value)}
                        className="bg-background border-input text-sm rounded-xl"
                      />
                    </div>
                  </>
                )}

                {/* 2. PROFESSIONAL FORM */}
                {role === 'professional' && currentStep === 1 && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Service Category</label>
                      <Input
                        placeholder="Legal Advisor, Fitness Trainer, Freelance Architect, Plumbing Expert"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="bg-background border-input text-sm rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Years of Experience</label>
                      <Input
                        type="number"
                        placeholder="5"
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(Number(e.target.value))}
                        className="bg-background border-input text-sm rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Certifications (Add list)</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g. Bar License, AWS Solutions Architect"
                          value={newCert}
                          onChange={(e) => setNewCert(e.target.value)}
                          className="bg-background border-input text-sm rounded-xl"
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            if (newCert.trim()) {
                              setCertifications([...certifications, newCert.trim()]);
                              setNewCert('');
                            }
                          }}
                          className="bg-secondary hover:bg-white/20 text-foreground"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {certifications.map((c, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-mono"
                          >
                            {c}
                            <button
                              type="button"
                              onClick={() => setCertifications(certifications.filter((_, i) => i !== idx))}
                              className="text-rose-400 hover:text-rose-600 ml-1"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {role === 'professional' && currentStep === 2 && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Min Pricing Hour / Rate ($)</label>
                        <Input
                          type="number"
                          placeholder="25"
                          value={pricingMin}
                          onChange={(e) => setPricingMin(Number(e.target.value))}
                          className="bg-background border-input text-sm rounded-xl"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Max Pricing Hour / Rate ($)</label>
                        <Input
                          type="number"
                          placeholder="150"
                          value={pricingMax}
                          onChange={(e) => setPricingMax(Number(e.target.value))}
                          className="bg-background border-input text-sm rounded-xl"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Operational Service Regions</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g. Manhattan, Brooklyn, Queens"
                          value={newArea}
                          onChange={(e) => setNewArea(e.target.value)}
                          className="bg-background border-input text-sm rounded-xl"
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            if (newArea.trim()) {
                              setServiceAreas([...serviceAreas, newArea.trim()]);
                              setNewArea('');
                            }
                          }}
                          className="bg-secondary hover:bg-white/20 text-foreground"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {serviceAreas.map((a, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono"
                          >
                            {a}
                            <button
                              type="button"
                              onClick={() => setServiceAreas(serviceAreas.filter((_, i) => i !== idx))}
                              className="text-rose-400 hover:text-rose-600 ml-1"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {role === 'professional' && currentStep === 3 && (
                  <>
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                        Set Weekly Availability Hours
                      </label>
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                        <div key={day} className="flex justify-between items-center gap-4 py-2 border-b border-border">
                          <span className="capitalize text-xs font-medium text-muted-foreground">{day}</span>
                          <Input
                            placeholder="Closed or 9am - 5pm"
                            value={availability[day] || ''}
                            onChange={(e) => setAvailability({ ...availability, [day]: e.target.value })}
                            className="max-w-[200px] h-8 bg-background border-input text-xs rounded-lg"
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* 3. EVENT ORGANIZER FORM */}
                {role === 'event-organizer' && currentStep === 1 && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Organizer / Agency Name</label>
                      <Input
                        placeholder="Metropolitan Events Ltd."
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        className="bg-background border-input text-sm rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Website</label>
                      <Input
                        placeholder="https://metroevents.com"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="bg-background border-input text-sm rounded-xl"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        placeholder="Facebook URL"
                        value={facebookLink}
                        onChange={(e) => setFacebookLink(e.target.value)}
                        className="bg-background border-input text-xs rounded-xl"
                      />
                      <Input
                        placeholder="Instagram URL"
                        value={instagramLink}
                        onChange={(e) => setInstagramLink(e.target.value)}
                        className="bg-background border-input text-xs rounded-xl"
                      />
                      <Input
                        placeholder="Twitter URL"
                        value={twitterLink}
                        onChange={(e) => setTwitterLink(e.target.value)}
                        className="bg-background border-input text-xs rounded-xl"
                      />
                    </div>
                  </>
                )}

                {role === 'event-organizer' && currentStep === 2 && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Categories of Hosted Events</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Concerts, Food Festivals, Coding Hackathons"
                          value={newEvCat}
                          onChange={(e) => setNewEvCat(e.target.value)}
                          className="bg-background border-input text-sm rounded-xl"
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            if (newEvCat.trim()) {
                              setEventCategories([...eventCategories, newEvCat.trim()]);
                              setNewEvCat('');
                            }
                          }}
                          className="bg-secondary hover:bg-white/20 text-foreground"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {eventCategories.map((ec, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-mono"
                          >
                            {ec}
                            <button
                              type="button"
                              onClick={() => setEventCategories(eventCategories.filter((_, i) => i !== idx))}
                              className="text-rose-400 hover:text-rose-600 ml-1"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Partnered Venues (Optional)</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Downtown Amphitheater, Metropolitan Convention Center"
                          value={newVenue}
                          onChange={(e) => setNewVenue(e.target.value)}
                          className="bg-background border-input text-sm rounded-xl"
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            if (newVenue.trim()) {
                              setVenuePartnerships([...venuePartnerships, newVenue.trim()]);
                              setNewVenue('');
                            }
                          }}
                          className="bg-secondary hover:bg-white/20 text-foreground"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {venuePartnerships.map((v, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono"
                          >
                            {v}
                            <button
                              type="button"
                              onClick={() => setVenuePartnerships(venuePartnerships.filter((_, i) => i !== idx))}
                              className="text-rose-400 hover:text-rose-600 ml-1"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <input
                        type="checkbox"
                        id="ticketingCheck"
                        checked={ticketingSupport}
                        onChange={(e) => setTicketingSupport(e.target.checked)}
                        className="h-4 w-4 rounded bg-background border-input text-cyan-600 focus:ring-cyan-500"
                      />
                      <label htmlFor="ticketingCheck" className="text-xs text-muted-foreground font-medium cursor-pointer">
                        Do you require integrated digital ticketing support?
                      </label>
                    </div>
                  </>
                )}

                {role === 'event-organizer' && currentStep === 3 && (
                  <>
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-4">
                      <label className="text-xs font-bold text-muted-foreground">Add a Past Event Showcase</label>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="Event Title"
                          value={newEvName}
                          onChange={(e) => setNewEvName(e.target.value)}
                          className="bg-background border-input text-xs rounded-xl"
                        />
                        <Input
                          type="date"
                          placeholder="Event Date"
                          value={newEvDate}
                          onChange={(e) => setNewEvDate(e.target.value)}
                          className="bg-background border-input text-xs rounded-xl"
                        />
                      </div>
                      <Textarea
                        placeholder="Brief summary of event turnout, theme..."
                        value={newEvDesc}
                        onChange={(e) => setNewEvDesc(e.target.value)}
                        className="min-h-16 bg-background border-input text-xs rounded-xl"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          if (newEvName && newEvDate) {
                            setPreviousEvents([
                              ...previousEvents,
                              { name: newEvName, date: newEvDate, description: newEvDesc },
                            ]);
                            setNewEvName('');
                            setNewEvDate('');
                            setNewEvDesc('');
                          }
                        }}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white w-full h-8 rounded-xl text-xs"
                      >
                        Add Past Event to List
                      </Button>
                    </div>

                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-semibold text-muted-foreground">Added Events ({previousEvents.length})</span>
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-2">
                        {previousEvents.map((ev, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center p-3 rounded-xl bg-muted/40 border border-border text-xs"
                          >
                            <div>
                              <p className="font-bold text-foreground">{ev.name}</p>
                              <p className="text-[10px] text-muted-foreground">{ev.date} - {ev.description}</p>
                            </div>
                            <Button
                              type="button"
                              onClick={() => setPreviousEvents(previousEvents.filter((_, i) => i !== idx))}
                              className="h-7 w-7 p-0 bg-transparent text-rose-400 hover:bg-rose-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* 4. NGO / COMMUNITY FORM */}
                {role === 'ngo' && currentStep === 1 && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">NGO / Organization Name</label>
                      <Input
                        placeholder="Global Help Federation"
                        value={ngoName}
                        onChange={(e) => setNgoName(e.target.value)}
                        className="bg-background border-input text-sm rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Registry Certificate Number</label>
                      <Input
                        placeholder="NGO-12345/A"
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                        className="bg-background border-input text-sm rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Website Link</label>
                      <Input
                        placeholder="https://globalhelp.org"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="bg-background border-input text-sm rounded-xl"
                      />
                    </div>
                  </>
                )}

                {role === 'ngo' && currentStep === 2 && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Primary Cause Category</label>
                      <Input
                        placeholder="Disaster Relief, Education For All, Stray Animals Rescue, Climate Action"
                        value={causeCategory}
                        onChange={(e) => setCauseCategory(e.target.value)}
                        className="bg-background border-input text-sm rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Operational Target Regions</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g. District A, District B, State-wide"
                          value={newOpArea}
                          onChange={(e) => setNewOpArea(e.target.value)}
                          className="bg-background border-input text-sm rounded-xl"
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            if (newOpArea.trim()) {
                              setOperationalAreas([...operationalAreas, newOpArea.trim()]);
                              setNewOpArea('');
                            }
                          }}
                          className="bg-secondary hover:bg-white/20 text-foreground"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {operationalAreas.map((a, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono"
                          >
                            {a}
                            <button
                              type="button"
                              onClick={() => setOperationalAreas(operationalAreas.filter((_, i) => i !== idx))}
                              className="text-rose-400 hover:text-rose-600 ml-1"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* 5. GOVERNMENT FORM */}
                {role === 'government' && currentStep === 1 && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Official Department Name</label>
                      <Input
                        placeholder="Department of Civic Infrastructure"
                        value={departmentName}
                        onChange={(e) => setDepartmentName(e.target.value)}
                        className="bg-background border-input text-sm rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Official Authority Email</label>
                      <Input
                        type="email"
                        placeholder="contact@civic.gov.in"
                        value={officialEmail}
                        onChange={(e) => setOfficialEmail(e.target.value)}
                        className="bg-background border-input text-sm rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Department Authority Type</label>
                      <select
                        value={departmentType}
                        onChange={(e) => setDepartmentType(e.target.value)}
                        className="w-full h-11 px-3 bg-background border border-input text-muted-foreground rounded-xl text-sm focus:outline-none cursor-pointer"
                      >
                        <option value="Local" className="bg-[#0f0f13]">Local Civic Body / Municipality</option>
                        <option value="District" className="bg-[#0f0f13]">District Commissioner Office</option>
                        <option value="State" className="bg-[#0f0f13]">State Administration</option>
                        <option value="Federal" className="bg-[#0f0f13]">Federal Ministry</option>
                      </select>
                    </div>
                  </>
                )}

                {role === 'government' && currentStep === 2 && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">District / Jurisdiction Coverage</label>
                      <Input
                        placeholder="South Bengaluru Division, Miami-Dade District"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="bg-background border-input text-sm rounded-xl"
                        required
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-between pt-6 border-t border-border">
                <Button
                  type="button"
                  onClick={handleBack}
                  disabled={currentStep === 1 || submitting}
                  className="h-11 px-5 bg-background border border-input text-muted-foreground rounded-xl cursor-pointer disabled:opacity-30"
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
          ) : (
            // FINAL STEP: DOCUMENT UPLOAD & SUBMISSION
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-violet-400" />
                  Submit Verification Documents
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload verification papers (Gazette papers, licenses, certificates, ID cards) to verify your entity profile.
                </p>
              </div>

              {/* Upload form container */}
              <form onSubmit={handleUploadDoc} className="p-5 rounded-2xl bg-muted/30 border border-border space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Document Type Label</label>
                    <Input
                      placeholder="e.g. Authority Letter, Press License, TIN Document"
                      value={docTypeLabel}
                      onChange={(e) => setDocTypeLabel(e.target.value)}
                      className="bg-background border-input text-xs rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Document / Certificate ID Number</label>
                    <Input
                      placeholder="e.g. LIC-998877"
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                      className="bg-background border-input text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Issued Authority Name</label>
                  <Input
                    placeholder="e.g. Internal Revenue Department, Ministry of Press"
                    value={issuedAuthority}
                    onChange={(e) => setIssuedAuthority(e.target.value)}
                    className="bg-background border-input text-xs rounded-xl"
                  />
                </div>

                {/* File picker */}
                <div className="p-6 rounded-2xl border-2 border-dashed border-input hover:border-violet-500/50 bg-white/[0.01] text-center cursor-pointer transition relative">
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/webp"
                    onChange={(e) => setVerificationDoc(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  {verificationDoc ? (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-violet-400">{verificationDoc.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(verificationDoc.size / 1024 / 1024).toFixed(2)} MB • Click to replace</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-foreground">Drag files here or click to browse</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Supports PDF, PNG, JPG, WEBP (Max 10MB)</p>
                    </div>
                  )}
                </div>

                {uploadProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Transmitting file chunks...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-1 bg-background" />
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={!verificationDoc || submitting}
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold h-10 rounded-xl text-xs cursor-pointer disabled:opacity-40"
                >
                  Upload & Register Document
                </Button>
              </form>

              {/* Uploaded documents showcase */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Registered Documents ({uploadedDocs.length})
                </h4>

                {uploadedDocs.length === 0 ? (
                  <div className="p-4 rounded-xl border border-border bg-white/[0.01] text-center text-xs text-muted-foreground">
                    No documents uploaded yet.
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-3">
                    {uploadedDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 rounded-xl border border-border bg-white/[0.02] flex justify-between items-start text-xs hover:border-input transition"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground flex items-center gap-1.5">
                            <FileCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                            {doc.documentType}
                          </p>
                          {doc.documentNumber && <p className="text-[10px] text-muted-foreground font-mono">ID: {doc.documentNumber}</p>}
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-cyan-400 hover:underline inline-block pt-1"
                          >
                            View Document File
                          </a>
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="h-7 w-7 p-0 bg-transparent text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between pt-6 border-t border-border">
                <Button
                  type="button"
                  onClick={handleBack}
                  disabled={submitting}
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
                  disabled={uploadedDocs.length === 0 || submitting}
                  className="h-11 px-6 bg-gradient-to-r from-emerald-600 to-cyan-500 text-white rounded-xl font-semibold cursor-pointer shadow-lg shadow-emerald-500/10 hover:opacity-90 transition disabled:opacity-40"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-1.5">
                      Submit for Verification
                      <ArrowRight className="h-4 w-4" />
                    </span>
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
