'use client';

// mock-db removed — all registration flows through real API
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { KERALA_CITIES } from '@/lib/constants';
import { RegistrationDetailsForm } from '@/components/business/registration-details';
import { PAYMENTS_ENABLED } from '@/lib/feature-flags';
import {
  Building2,
  Loader2,
  UploadCloud,
  ArrowRight,
  ArrowLeft,
  FileCheck,
  MapPin,
  Layers,
} from 'lucide-react';
import type { Wizard } from './use-register-wizard';
import { FieldError, OptionalSection, WizardActions, useTouched } from './wizard-ui';

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
    isHotel,
    companyName,
    categoryLabel,
  } = w;
  const t = useTouched();
  const addressMissing = !address.trim();

  const onSubmit = (e: React.FormEvent) => {
    if (addressMissing) {
      e.preventDefault();
      t.attempt();
      const el = document.getElementById('reg-address');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus({ preventScroll: true });
      return;
    }
    handleStep4Submit(e);
  };
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6 ui-pop">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          {role === 'BUSINESS' ? 'Where can customers find you?' : 'Profile setup'}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {role === 'BUSINESS'
            ? 'Add your address and business details. Anything marked optional can wait until after you sign up.'
            : 'Provide your location and official documents.'}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="reg-city" className="text-xs font-medium text-muted-foreground">
            City / district
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <select
              id="reg-city"
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
          <label htmlFor="reg-address" className="text-xs font-medium text-muted-foreground">
            Full address
          </label>
          <Input
            id="reg-address"
            type="text"
            autoComplete="street-address"
            enterKeyHint="next"
            placeholder="e.g. 45/998-A, MG Road, Ernakulam"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onBlur={() => t.touch('address')}
            aria-invalid={t.show('address') && addressMissing}
            className={`h-11 bg-background text-sm text-foreground rounded-xl ${
              t.show('address') && addressMissing ? 'border-destructive/50' : 'border-input'
            }`}
          />
          <FieldError>
            {t.show('address') && addressMissing ? 'Enter the address customers can visit.' : null}
          </FieldError>
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

        {/* Registration certificate: optional, can be added from the dashboard */}
        {role === 'BUSINESS' && (
          <div className="space-y-2 pt-3 border-t border-border">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <FileCheck className="h-4 w-4 text-info-soft-foreground" />
              Business registration certificate{' '}
              <span className="text-muted-foreground/70">(optional, PDF or photo)</span>
            </label>
            <div className="p-4 rounded-xl border border-dashed border-input hover:border-border bg-white/[0.01] text-center cursor-pointer relative min-h-24">
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
                  Tap to choose a file (max 10MB). Reviewers use it to verify you faster.
                </p>
              )}
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
          <OptionalSection
            title="Description, tags and logo"
            hint="Help customers find and recognise you. You can add these later from your dashboard."
          >
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

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-info-soft-foreground" />
                Logo (PNG or JPG)
              </label>
              <div className="p-4 rounded-xl border border-dashed border-input hover:border-border bg-white/[0.01] text-center cursor-pointer relative min-h-24">
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
                  <p className="text-xs text-muted-foreground">Tap to choose a logo (max 10MB)</p>
                )}
              </div>
            </div>
          </OptionalSection>

          <div>
            <h3 className="text-sm font-bold text-foreground">Registration details</h3>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
              Company, PAN/GST, contacts and category status.
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

      {role === 'BUSINESS' && (
        <dl className="space-y-1.5 rounded-xl border border-border bg-muted/30 p-4 text-xs">
          <dt className="font-semibold text-foreground">Before you continue</dt>
          <dd className="text-muted-foreground">
            <span className="text-foreground">{companyName || 'Your business'}</span> in{' '}
            {categoryLabel}, {city || 'Kerala'}
          </dd>
          <dd className="text-muted-foreground">
            Registration certificate:{' '}
            {certFile ? (
              <span className="text-foreground">{certFile.name}</span>
            ) : (
              'not attached yet. You can add it later, but approval is quicker with it.'
            )}
          </dd>
        </dl>
      )}

      <WizardActions>
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
              {role === 'BUSINESS'
                ? PAYMENTS_ENABLED || isHotel
                  ? PAYMENTS_ENABLED
                    ? 'Continue to Plan & Payment'
                    : 'Continue'
                  : 'Submit Application'
                : 'Submit Application'}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </WizardActions>
    </form>
  );
}
