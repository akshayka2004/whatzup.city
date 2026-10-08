'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, KeyRound, Lock, TriangleAlert } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { Button } from '@/components/ui/button';
import { AuthField, AuthShell, FormAlert } from '@/components/auth/auth-shell';
import { cn } from '@/lib/utils';

const RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'An uppercase and a lowercase letter', test: (p) => /[A-Z]/.test(p) && /[a-z]/.test(p) },
  { label: 'A number', test: (p) => /\d/.test(p) },
  { label: 'A symbol (!@#$%^&*)', test: (p) => /[!@#$%^&*]/.test(p) },
];

function ResetForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get('token') || '';
  const tenantId = sp.get('tenant') || '';
  const linkOk = token.length > 10 && /^[0-9a-f-]{36}$/i.test(tenantId);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  const checks = useMemo(() => RULES.map((r) => ({ ...r, ok: r.test(password) })), [password]);
  const strong = checks.every((c) => c.ok);
  const matches = password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setError('');
    if (!strong || !matches) return;
    setSubmitting(true);
    const res = await apiService.post('/v1/auth/reset-password', { token, tenantId, newPassword: password });
    setSubmitting(false);
    if (res.error) {
      setError(/expired|invalid/i.test(res.error) ? 'This reset link has expired or was already used. Request a new one.' : res.error);
      return;
    }
    router.replace('/login?reset=1');
  };

  if (!linkOk) {
    return (
      <AuthShell
        icon={TriangleAlert}
        title="This link isn't valid"
        description="The reset link is incomplete or has expired. Request a new one and use the latest email."
        footer={
          <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        }
      >
        <Button asChild size="lg" className="w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell icon={KeyRound} title="Choose a new password" description="You'll use it to sign in from now on.">
      {error && (
        <FormAlert tone="error">
          {error}{' '}
          {/expired/i.test(error) && (
            <Link href="/forgot-password" className="font-semibold underline">
              Request a new link
            </Link>
          )}
        </FormAlert>
      )}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthField
          label="New password"
          name="new-password"
          type="password"
          icon={Lock}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={touched && !strong ? 'Your password doesn’t meet every rule below.' : undefined}
        />
        <ul className="grid gap-1.5 sm:grid-cols-2" aria-label="Password rules">
          {checks.map((c) => (
            <li key={c.label} className={cn('flex items-center gap-1.5 text-caption', c.ok ? 'text-success-soft-foreground' : 'text-muted-foreground')}>
              <span className={cn('flex size-4 items-center justify-center rounded-full', c.ok ? 'bg-success-soft' : 'bg-surface-sunken')}>
                {c.ok && <Check className="size-3" aria-hidden />}
              </span>
              {c.label}
              <span className="sr-only">{c.ok ? '(done)' : '(missing)'}</span>
            </li>
          ))}
        </ul>
        <AuthField
          label="Confirm new password"
          name="confirm-password"
          type="password"
          icon={Lock}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={touched && confirm && !matches ? 'Passwords don’t match.' : touched && !confirm ? 'Type the password again.' : undefined}
        />
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <ResetForm />
    </Suspense>
  );
}
