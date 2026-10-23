'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { authService } from '@/lib/services/auth-service';
// mock-db removed — all registration flows through real API
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BillSeriesQuestion } from '@/components/business/brand-conversion-prompt';
import {
  User as UserIcon,
  Building2,
  Mail,
  Phone,
  Key,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Heart,
  Store,
  Clock,
} from 'lucide-react';
import type { Wizard } from './use-register-wizard';
import { CategoryPicker } from './category-picker';
import { FieldError, FieldHint, PasswordMeter, WizardActions, useTouched } from './wizard-ui';

const ROLE_NOUN: Record<string, string> = {
  BUSINESS: 'business',
  CUSTOMER: 'customer',
  GOVERNMENT: 'government',
  NGO_COMMUNITY: 'organisation',
};

const TIME_AND_NEEDS: Record<string, string> = {
  BUSINESS:
    'About 3 minutes. Next you add your address, and have your business registration details handy.',
  CUSTOMER: 'About a minute.',
  GOVERNMENT: 'About 3 minutes. Keep your department ID proof handy.',
  NGO_COMMUNITY: 'About 3 minutes. Keep your registration details handy.',
};

const inputBase = 'h-11 bg-background text-sm text-foreground rounded-xl';
const border = (bad: boolean) => (bad ? 'border-destructive/50' : 'border-input');

export function StepCredentials({ w }: { w: Wizard }) {
  const {
    setCurrentStep,
    role,
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
    registrationCategories,
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
    acceptedTerms,
    setAcceptedTerms,
    acceptedPrivacy,
    setAcceptedPrivacy,
    civicOrgType,
    organizationName,
    setOrganizationName,
    loading,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasDigit,
    hasSpecialChar,
    isPasswordValid,
    isPhoneValid,
    isEmailValid,
    handleStep2Submit,
  } = w;

  const t = useTouched();

  // Already-registered email or phone, found by asking the API when the field is left. Stored as
  // the value that was found taken, so editing the field clears the message by itself.
  const [taken, setTaken] = useState<{ email?: string; phone?: string }>({});
  const emailTaken = !!email && taken.email === email;
  const phoneTaken = !!phone && taken.phone === phone;
  const asked = useRef(new Set<string>());
  const checkTaken = async (field: 'email' | 'phone') => {
    const value = field === 'email' ? email : phone;
    if (!value || !(field === 'email' ? isEmailValid : isPhoneValid)) return;
    const key = field + ':' + value;
    if (asked.current.has(key)) return;
    asked.current.add(key);
    const kind = role === 'BUSINESS' ? 'BUSINESS' : role === 'CUSTOMER' ? 'CUSTOMER' : 'OTHER';
    const res = await authService.checkAvailability({ [field]: value, kind });
    if (!res) asked.current.delete(key);
    if (field === 'email' ? res?.emailTaken : res?.phoneTaken) {
      setTaken((p) => ({ ...p, [field]: value }));
    }
  };
  // Check once typing pauses; this also covers values restored from a saved draft.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkTaken('email');
      void checkTaken('phone');
    }, 700);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, phone]);
  const consent = acceptedTerms && acceptedPrivacy;
  const score = [hasMinLength, hasUppercase, hasLowercase, hasDigit, hasSpecialChar].filter(
    Boolean,
  ).length;

  const nameLabel =
    role === 'BUSINESS'
      ? 'Owner full name'
      : role === 'GOVERNMENT'
        ? 'Department official name'
        : role === 'NGO_COMMUNITY'
          ? 'Contact person name'
          : 'Full name';
  const orgLabel =
    civicOrgType === 'NGO'
      ? 'NGO name'
      : civicOrgType === 'COMMUNITY'
        ? 'Community name'
        : 'Forum / publication name';

  // One message per field, in the order they appear on screen.
  const missing: string[] = [];
  if (!hasMinLength) missing.push('8+ characters');
  if (!hasUppercase) missing.push('an uppercase letter');
  if (!hasLowercase) missing.push('a lowercase letter');
  if (!hasDigit) missing.push('a number');
  if (!hasSpecialChar) missing.push('a symbol like @ or #');
  const errors: [string, string | null][] = [
    ['reg-name', name.trim() ? null : `Enter the ${nameLabel.toLowerCase()}.`],
    [
      'reg-email',
      !email
        ? 'Enter your email address.'
        : !isEmailValid
          ? 'That email does not look right. It should be like name@example.com.'
          : emailTaken
            ? 'This email is already registered.'
            : null,
    ],
    [
      'reg-phone',
      !phone
        ? role === 'CUSTOMER'
          ? null
          : 'Enter your 10-digit mobile number.'
        : !isPhoneValid
          ? `${phone.length} of 10 digits entered.`
          : phoneTaken
            ? 'This mobile number is already registered.'
            : null,
    ],
    [
      'reg-password',
      !password
        ? 'Create a password.'
        : isPasswordValid
          ? null
          : `Still needs ${missing.join(', ')}.`,
    ],
    [
      'reg-org',
      role === 'NGO_COMMUNITY' && !organizationName.trim() ? `Enter the ${orgLabel}.` : null,
    ],
    [
      'reg-brand',
      role === 'BUSINESS' && accountType === 'BRAND' && !brandNameInput.trim()
        ? 'Enter the brand name.'
        : null,
    ],
    [
      'reg-company',
      role === 'BUSINESS' && !companyName.trim() ? 'Enter your business or trading name.' : null,
    ],
    ['reg-consent', consent ? null : 'Please accept to continue.'],
  ];
  const err = (id: string) => errors.find(([k]) => k === id)?.[1] ?? null;
  const shown = (id: string, field: string) => (t.show(field) ? err(id) : null);

  const onSubmit = (e: React.FormEvent) => {
    const first = errors.find(([, m]) => m);
    if (first) {
      e.preventDefault();
      t.attempt();
      const el = document.getElementById(first[0]);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (el as HTMLElement | null)?.focus?.({ preventScroll: true });
      return;
    }
    handleStep2Submit(e);
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6 ui-pop">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h2 className="text-xl font-bold text-foreground">
            Create your {ROLE_NOUN[role] ?? ''} account
          </h2>
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="cursor-pointer text-xs font-medium text-primary underline underline-offset-2"
          >
            Change
          </button>
        </div>
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {TIME_AND_NEEDS[role] ?? TIME_AND_NEEDS.CUSTOMER} Your answers are saved as you go.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="reg-name" className="text-xs font-medium text-muted-foreground">
              {nameLabel}
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="reg-name"
                type="text"
                autoComplete="name"
                enterKeyHint="next"
                placeholder="e.g. Adarsh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => t.touch('name')}
                aria-invalid={!!shown('reg-name', 'name')}
                aria-describedby="reg-name-err"
                className={`pl-10 ${inputBase} ${border(!!shown('reg-name', 'name'))}`}
              />
            </div>
            <FieldError id="reg-name-err">{shown('reg-name', 'name')}</FieldError>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-email" className="text-xs font-medium text-muted-foreground">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="reg-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                enterKeyHint="next"
                placeholder="adarsh@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                onBlur={() => {
                  t.touch('email');
                  void checkTaken('email');
                }}
                aria-invalid={!!shown('reg-email', 'email')}
                aria-describedby="reg-email-err"
                className={`pl-10 ${inputBase} ${border(!!shown('reg-email', 'email'))}`}
              />
            </div>
            <FieldError id="reg-email-err">
              {shown('reg-email', 'email')}
              {emailTaken && t.show('email') && (
                <>
                  {' '}
                  <Link href="/login" className="underline underline-offset-2">
                    Sign in instead
                  </Link>
                </>
              )}
            </FieldError>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="reg-phone" className="text-xs font-medium text-muted-foreground">
              Mobile number{role === 'CUSTOMER' && ' (optional)'}
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="reg-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                enterKeyHint="next"
                placeholder="10-digit number, e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onBlur={() => {
                  t.touch('phone');
                  void checkTaken('phone');
                }}
                maxLength={10}
                aria-invalid={!!shown('reg-phone', 'phone')}
                aria-describedby="reg-phone-err"
                className={`pl-10 ${inputBase} ${border(!!shown('reg-phone', 'phone'))}`}
              />
            </div>
            <FieldError id="reg-phone-err">
              {shown('reg-phone', 'phone')}
              {phoneTaken && t.show('phone') && (
                <>
                  {' '}
                  <Link href="/login" className="underline underline-offset-2">
                    Sign in instead
                  </Link>
                </>
              )}
            </FieldError>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-password" className="text-xs font-medium text-muted-foreground">
              Password
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                enterKeyHint="next"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => t.touch('password')}
                aria-invalid={!!shown('reg-password', 'password')}
                aria-describedby="reg-password-err"
                className={`pl-10 pr-11 ${inputBase} ${border(!!shown('reg-password', 'password'))}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-0.5 top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center text-muted-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password ? (
              <>
                <PasswordMeter score={score} />
                <p
                  className={
                    isPasswordValid
                      ? 'text-xs text-success-soft-foreground'
                      : 'text-xs text-muted-foreground'
                  }
                >
                  {isPasswordValid ? 'Looks good.' : `Add ${missing.join(', ')}.`}
                </p>
              </>
            ) : (
              <FieldHint>8+ characters with upper and lower case, a number and a symbol.</FieldHint>
            )}
            <FieldError id="reg-password-err">
              {!password ? shown('reg-password', 'password') : null}
            </FieldError>
          </div>
        </div>

        {/* CIVIC Additional Fields */}
        {role === 'NGO_COMMUNITY' && (
          <div className="space-y-4 pt-3 border-t border-border">
            <div className="space-y-1.5">
              <label htmlFor="reg-org" className="text-xs font-medium text-muted-foreground">
                {orgLabel}
              </label>
              <div className="relative">
                <Heart className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-org"
                  type="text"
                  autoComplete="organization"
                  placeholder={
                    civicOrgType === 'NGO'
                      ? 'e.g. Kerala Welfare Foundation'
                      : civicOrgType === 'COMMUNITY'
                        ? 'e.g. Trivandrum Residents Forum'
                        : 'e.g. Kerala Times Digital'
                  }
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  onBlur={() => t.touch('org')}
                  aria-invalid={!!shown('reg-org', 'org')}
                  className={`pl-10 ${inputBase} ${border(!!shown('reg-org', 'org'))}`}
                />
              </div>
              <FieldError>{shown('reg-org', 'org')}</FieldError>
            </div>
          </div>
        )}

        {/* BUSINESS Additional Fields */}
        {role === 'BUSINESS' && (
          <div className="space-y-4 pt-3 border-t border-border">
            {/* Single listing, or a brand whose outlets each get their own listing */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                How is your business set up?
              </label>
              <div
                className="grid gap-3 sm:grid-cols-2"
                role="radiogroup"
                aria-label="Account type"
              >
                {(
                  [
                    {
                      v: 'SINGLE',
                      title: 'Single business',
                      desc: 'One location with its own listing.',
                      Icon: Building2,
                    },
                    {
                      v: 'BRAND',
                      title: 'Brand with multiple outlets',
                      desc: 'Several outlets under one brand. Each has its own listing and offers.',
                      Icon: Store,
                    },
                  ] as const
                ).map(({ v, title, desc, Icon }) => (
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
                      <Icon
                        className={`h-4 w-4 shrink-0 ${accountType === v ? 'text-primary' : 'text-muted-foreground'}`}
                      />
                      {title}
                    </span>
                    <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                      {desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {accountType === 'BRAND' && (
              <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4 ui-fade-up">
                <div className="space-y-1.5">
                  <label htmlFor="reg-brand" className="text-xs font-medium text-muted-foreground">
                    Brand name <span className="text-danger-soft-foreground">*</span>
                  </label>
                  <Input
                    id="reg-brand"
                    type="text"
                    placeholder="e.g. Sunrise Cafe"
                    value={brandNameInput}
                    onChange={(e) => setBrandNameInput(e.target.value)}
                    onBlur={() => t.touch('brand')}
                    maxLength={255}
                    aria-invalid={!!shown('reg-brand', 'brand')}
                    className={`${inputBase} ${border(!!shown('reg-brand', 'brand'))}`}
                  />
                  <FieldError>{shown('reg-brand', 'brand')}</FieldError>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    This outlet&apos;s label{' '}
                    <span className="text-muted-foreground/70">(optional)</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Kozhikode - Mavoor Road"
                    value={outletLabel}
                    onChange={(e) => setOutletLabel(e.target.value)}
                    maxLength={100}
                    className={`${inputBase} border-input`}
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
              <label htmlFor="reg-company" className="text-xs font-medium text-muted-foreground">
                Business / trading name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-company"
                  type="text"
                  autoComplete="organization"
                  placeholder="e.g. Sunrise Cafe Ltd."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  onBlur={() => t.touch('company')}
                  aria-invalid={!!shown('reg-company', 'company')}
                  className={`pl-10 ${inputBase} ${border(!!shown('reg-company', 'company'))}`}
                />
              </div>
              <FieldError>{shown('reg-company', 'company')}</FieldError>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                What does your business do?
              </label>
              <CategoryPicker
                categories={registrationCategories}
                categorySlug={categorySlug}
                subcategorySlug={subcategorySlug}
                onCategory={(slug) => {
                  setCategorySlug(slug);
                  const cat = registrationCategories.find((c) => c.slug === slug);
                  setSubcategorySlug(cat?.subcategories?.[0]?.slug || '');
                }}
                onSubcategory={setSubcategorySlug}
              />
            </div>

            {/* Halal / Non-Halal — Food businesses only */}
            {categorySlug === 'food' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Halal status</label>
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
                <FieldHint>Shown as a tag on your business profile.</FieldHint>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Referral Code */}
      <div className="space-y-1.5 pt-2">
        <label htmlFor="reg-referral" className="text-xs font-medium text-muted-foreground">
          Referral code <span className="text-muted-foreground">(optional)</span>
        </label>
        <div className="relative">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="reg-referral"
            type="text"
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="Enter referral code if you have one"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            maxLength={20}
            className={`pl-10 ${inputBase} border-input font-mono tracking-wider`}
          />
        </div>
      </div>

      {/* Legal acceptance: one tick covers both documents */}
      <div className="space-y-1.5 pt-3 border-t border-border">
        <label className="flex items-start gap-3 cursor-pointer min-h-11">
          <input
            id="reg-consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setAcceptedTerms(e.target.checked);
              setAcceptedPrivacy(e.target.checked);
            }}
            aria-invalid={t.show('consent') && !consent}
            className="mt-0.5 h-5 w-5 shrink-0 accent-primary cursor-pointer"
          />
          <span className="text-xs text-muted-foreground leading-relaxed">
            I agree to the{' '}
            <Link
              href="/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Terms of Service
            </Link>{' '}
            and the{' '}
            <Link
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Privacy Policy
            </Link>{' '}
            of Whtzup.city <span className="text-danger-soft-foreground">*</span>
          </span>
        </label>
        <FieldError>{t.show('consent') ? err('reg-consent') : null}</FieldError>
      </div>

      <WizardActions>
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
          onClick={() => t.touch('consent')}
          className="rounded-xl h-11 px-6 font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating account...
            </>
          ) : (
            <>
              {role === 'BUSINESS' ? 'Create account and continue' : 'Create account'}{' '}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </WizardActions>
    </form>
  );
}
