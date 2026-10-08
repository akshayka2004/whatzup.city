'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, KeyRound, Mail, MailCheck } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { Button } from '@/components/ui/button';
import { AuthField, AuthShell, FormAlert } from '@/components/auth/auth-shell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setFieldError('Enter the email address you signed up with.');
      return;
    }
    setFieldError('');
    setSubmitting(true);
    const res = await apiService.post('/v1/auth/forgot-password', { email: email.trim() });
    setSubmitting(false);
    // Same screen whether or not the account exists, so the form can't be used to probe emails.
    if (res.error && res.status >= 500) setError("We couldn't send the email right now. Please try again in a minute.");
    else setSent(true);
  };

  const back = (
    <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline">
      <ArrowLeft className="size-4" /> Back to sign in
    </Link>
  );

  if (sent) {
    return (
      <AuthShell
        icon={MailCheck}
        title="Check your email"
        description={
          <>
            If an account exists for <span className="font-medium text-foreground">{email}</span>, we&apos;ve sent a link to reset
            your password. It expires in 1 hour.
          </>
        }
        footer={back}
      >
        <Button variant="outline" size="lg" className="w-full" onClick={() => setSent(false)}>
          Use a different email
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell icon={KeyRound} title="Reset your password" description="Enter your email and we’ll send you a reset link." footer={back}>
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
          error={fieldError}
        />
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Send reset link
        </Button>
      </form>
    </AuthShell>
  );
}
