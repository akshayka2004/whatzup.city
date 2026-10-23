'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, KeyRound, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { AuthField, AuthShell, FormAlert } from '@/components/auth/auth-shell';
import { TwoFactorRequiredError } from '@/lib/services/auth-service';

function LoginForm() {
  const { signIn, completeTwoFactor } = useAuth();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || undefined;
  const resetDone = searchParams.get('reset') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  // Set once the password is accepted for an account with two-factor sign-in.
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');

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
      if (err instanceof TwoFactorRequiredError) {
        setChallenge(err.challengeToken);
        setPassword('');
        return;
      }
      setError(
        err?.message || "We couldn't sign you in. Check your email and password, then try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const value = code.trim();
    if (
      !/^\d{6}$/.test(value.replace(/\s/g, '')) &&
      !/^[A-Za-z0-9]{5}-?[A-Za-z0-9]{5}$/.test(value)
    ) {
      setCodeError('Enter the 6-digit code from your app, or a recovery code.');
      return;
    }
    setCodeError('');
    setSubmitting(true);
    try {
      await completeTwoFactor(challenge!, value, redirectTo);
    } catch (err: any) {
      const message = err?.message || "That code didn't work. Try again.";
      // An expired or locked challenge means starting over from the password.
      if (/password again/i.test(message)) {
        setChallenge(null);
        setCode('');
        setError(message);
      } else {
        setCodeError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (challenge) {
    return (
      <AuthShell
        title="Two-step sign-in"
        description="Open your authenticator app and enter the 6-digit code for Whtzup.city."
      >
        {error && <FormAlert tone="error">{error}</FormAlert>}
        <form onSubmit={handleCode} className="space-y-4" noValidate>
          <AuthField
            label="Code"
            name="code"
            icon={KeyRound}
            autoComplete="one-time-code"
            inputMode="numeric"
            autoFocus
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            error={codeError}
            hint="Lost your phone? Enter one of your recovery codes instead."
          />
          <Button type="submit" size="lg" className="w-full" loading={submitting}>
            Verify and sign in <ArrowRight />
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setChallenge(null);
              setCode('');
              setCodeError('');
            }}
          >
            Use a different account
          </Button>
        </form>
      </AuthShell>
    );
  }

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
