'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { AuthField, AuthShell, FormAlert } from '@/components/auth/auth-shell';
import { OtpLoginForm } from '@/components/auth/otp-login-form';
import { OTP_LOGIN_ENABLED } from '@/lib/feature-flags';
import { cn } from '@/lib/utils';

function LoginForm() {
  const { signIn } = useAuth();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || undefined;
  const resetDone = searchParams.get('reset') === '1';

  const [method, setMethod] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errs: typeof fieldErrors = {};
    if (!email.trim()) errs.email = 'Enter your email address.';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      errs.email = 'That email address doesn’t look right.';
    if (!password) errs.password = 'Enter your password.';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    try {
      const ok = await signIn(email.trim(), password, redirectTo);
      if (!ok) setError('Email or password is incorrect.');
    } catch (err: any) {
      setError(
        err?.message || "We couldn't sign you in. Check your email and password, then try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to manage your listing, claim offers and track your rewards."
      footer={
        <>
          New to Whtzup.city?{' '}
          <Link
            href="/register"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      {resetDone && (
        <FormAlert tone="success">Password updated. Sign in with your new password.</FormAlert>
      )}
      {OTP_LOGIN_ENABLED && (
        <div
          role="tablist"
          aria-label="Sign-in method"
          className="mb-5 grid grid-cols-2 gap-1 rounded-control bg-surface-sunken p-1"
        >
          {(
            [
              ['password', 'Email and password'],
              ['otp', 'Mobile code'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={method === value}
              onClick={() => {
                setMethod(value);
                setError('');
              }}
              className={cn(
                'min-h-10 cursor-pointer rounded-[10px] px-3 text-label transition-colors',
                method === value ? 'bg-card text-foreground shadow-e1' : 'text-muted-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {OTP_LOGIN_ENABLED && method === 'otp' ? (
        <OtpLoginForm redirectTo={redirectTo} />
      ) : (
        <>
          {error && <FormAlert tone="error">{error}</FormAlert>}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <AuthField
              label="Email"
              name="email"
              type="email"
              icon={Mail}
              autoComplete="email"
              inputMode="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
            />
            <div>
              <AuthField
                label="Password"
                name="password"
                type="password"
                icon={Lock}
                autoComplete="current-password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
              />
              <div className="mt-2 text-right">
                <Link
                  href="/forgot-password"
                  className="text-label text-primary underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full" loading={submitting}>
              Sign in <ArrowRight />
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <LoginForm />
    </Suspense>
  );
}
