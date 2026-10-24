'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import { Button } from '@/components/ui/button';
import { AuthField, AuthShell, FormAlert } from '@/components/auth/auth-shell';

const STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W).{8,}$/;

/** Where a signed-in account lands once its temporary password has been replaced. */
function homeFor(u: { role?: string; rbacRole?: string }) {
  if (u.rbacRole === 'SUPER_ADMIN') return '/super-admin';
  if (u.rbacRole === 'MASTER_ADMIN') return '/admin';
  if (u.rbacRole === 'PLATFORM_STAFF') return '/staff';
  return '/';
}

export default function ChangePasswordPage() {
  const { user, loading, refreshUser, signOut } = useAuth();
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string; again?: string }>({});

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errs: typeof errors = {};
    if (!current) errs.current = 'Enter the temporary password you were given.';
    if (!STRONG.test(next))
      errs.next = 'Use 8+ characters with upper and lower case, a number and a symbol.';
    else if (next === current) errs.next = 'Choose a password different from the temporary one.';
    if (again !== next) errs.again = 'The two passwords do not match.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    const res = await apiService.post<any>('/v1/users/me/change-password', {
      currentPassword: current,
      newPassword: next,
    });
    if (res.error) {
      setBusy(false);
      setError(res.error);
      return;
    }
    const fresh = await refreshUser();
    router.replace(homeFor(fresh ?? user ?? {}));
  };

  return (
    <AuthShell
      icon={Lock}
      title="Choose a new password"
      description={
        user?.mustChangePassword
          ? 'You signed in with a temporary password. Set your own to continue.'
          : 'Change the password you use to sign in.'
      }
      footer={
        <button
          type="button"
          onClick={() => signOut()}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Sign out
        </button>
      }
    >
      {error && <FormAlert tone="error">{error}</FormAlert>}
      <form onSubmit={submit} className="space-y-4" noValidate>
        <AuthField
          label="Temporary password"
          name="current"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          error={errors.current}
        />
        <AuthField
          label="New password"
          name="new"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          error={errors.next}
          hint="8+ characters with upper and lower case, a number and a symbol."
        />
        <AuthField
          label="Repeat new password"
          name="again"
          type="password"
          autoComplete="new-password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
          error={errors.again}
        />
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Save and continue <ArrowRight />
        </Button>
      </form>
    </AuthShell>
  );
}
