'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { Copy, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import { Button } from '@/components/ui/button';
import { AuthField, AuthShell, FormAlert } from '@/components/auth/auth-shell';

interface Status {
  enabled: boolean;
  enabledAt: string | null;
  recoveryCodesLeft: number;
  required: boolean;
}

type Step = 'idle' | 'scan' | 'codes' | 'disable';

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-4">
      <FormAlert tone="success">
        Two-factor sign-in is on. Save these recovery codes somewhere safe: each one works once if
        you lose your phone. They won&apos;t be shown again.
      </FormAlert>
      <ul className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-surface-sunken p-3 font-mono text-sm tabular-nums">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => {
            navigator.clipboard
              ?.writeText(codes.join('\n'))
              .then(() => setCopied(true))
              .catch(() => {});
          }}
        >
          <Copy /> {copied ? 'Copied' : 'Copy codes'}
        </Button>
        <Button type="button" className="flex-1" onClick={onDone}>
          I&apos;ve saved them
        </Button>
      </div>
    </div>
  );
}

function SecurityPanel() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const required = useSearchParams().get('required') === '1';

  const [status, setStatus] = useState<Status | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [secret, setSecret] = useState('');
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await apiService.get<Status>('/v1/auth/2fa', { fresh: true });
    if (res.data) setStatus(res.data);
    else setError(res.error || "Couldn't load your sign-in settings.");
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login?redirect=/account/security');
      return;
    }
    void load();
  }, [user, loading, router, load]);

  const startSetup = async () => {
    setError('');
    setBusy(true);
    const res = await apiService.post<{ secret: string; otpauthUrl: string }>('/v1/auth/2fa/setup');
    setBusy(false);
    if (!res.data) {
      setError(res.error || "Couldn't start setup. Try again.");
      return;
    }
    setSecret(res.data.secret);
    setQr(await QRCode.toDataURL(res.data.otpauthUrl, { margin: 1, width: 220 }));
    setCode('');
    setStep('scan');
  };

  const confirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await apiService.post<{ recoveryCodes: string[] }>('/v1/auth/2fa/enable', {
      code: code.trim(),
    });
    setBusy(false);
    if (!res.data) {
      setError(res.error || 'That code is not right. Try the next one your app shows.');
      return;
    }
    setCodes(res.data.recoveryCodes);
    setSecret('');
    setQr('');
    setStep('codes');
    void load();
  };

  const newCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await apiService.post<{ recoveryCodes: string[] }>('/v1/auth/2fa/recovery-codes', {
      code: code.trim(),
    });
    setBusy(false);
    if (!res.data) {
      setError(res.error || 'That code is not right.');
      return;
    }
    setCodes(res.data.recoveryCodes);
    setStep('codes');
    void load();
  };

  const disable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await apiService.post('/v1/auth/2fa/disable', { password, code: code.trim() });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setPassword('');
    setCode('');
    setStep('idle');
    void load();
  };

  const codeField = (
    <AuthField
      label="Code from your app"
      name="code"
      icon={KeyRound}
      autoComplete="one-time-code"
      inputMode="numeric"
      placeholder="123456"
      value={code}
      onChange={(e) => setCode(e.target.value)}
    />
  );

  return (
    <AuthShell
      icon={ShieldCheck}
      title="Two-factor sign-in"
      description="Ask for a code from an authenticator app (Google Authenticator, Authy, 1Password, Microsoft Authenticator) whenever you sign in."
      footer={
        <Link href="/" className="font-semibold text-primary underline-offset-4 hover:underline">
          Back to Whtzup.city
        </Link>
      }
    >
      {required && !status?.enabled && (
        <FormAlert tone="error">
          Your role needs two-factor sign-in before you can use admin tools. It takes about a
          minute.
        </FormAlert>
      )}
      {error && <FormAlert tone="error">{error}</FormAlert>}

      {!status ? (
        <div className="h-24 animate-pulse rounded-lg bg-surface-sunken" aria-busy="true" />
      ) : step === 'codes' ? (
        <RecoveryCodes
          codes={codes}
          onDone={() => {
            setCodes([]);
            setCode('');
            setStep('idle');
          }}
        />
      ) : step === 'scan' ? (
        <form onSubmit={confirmSetup} className="space-y-4" noValidate>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Open your authenticator app and add an account.</li>
            <li>Scan this QR code, or type the key below.</li>
            <li>Enter the 6-digit code the app shows.</li>
          </ol>
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element -- data: URL, nothing to optimise
            <img
              src={qr}
              alt="QR code for your authenticator app"
              width={220}
              height={220}
              className="mx-auto rounded-lg border border-border bg-white p-2"
            />
          )}
          <p className="break-all rounded-lg bg-surface-sunken p-3 text-center font-mono text-sm tracking-wider">
            {secret.replace(/(.{4})/g, '$1 ').trim()}
          </p>
          {codeField}
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Turn on two-factor sign-in
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setStep('idle')}>
            Cancel
          </Button>
        </form>
      ) : step === 'disable' ? (
        <form onSubmit={disable} className="space-y-4" noValidate>
          <AuthField
            label="Password"
            name="password"
            type="password"
            icon={Lock}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {codeField}
          <Button type="submit" variant="destructive" size="lg" className="w-full" loading={busy}>
            Turn off two-factor sign-in
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setStep('idle')}>
            Cancel
          </Button>
        </form>
      ) : status.enabled ? (
        <div className="space-y-4">
          <FormAlert tone="success">
            Two-factor sign-in is on
            {status.enabledAt
              ? ` since ${new Date(status.enabledAt).toLocaleDateString()}`
              : ''}. {status.recoveryCodesLeft} recovery code
            {status.recoveryCodesLeft === 1 ? '' : 's'} left.
          </FormAlert>
          <form onSubmit={newCodes} className="space-y-3" noValidate>
            {codeField}
            <Button type="submit" variant="outline" className="w-full" loading={busy}>
              Get new recovery codes
            </Button>
          </form>
          {!status.required && (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-destructive"
              onClick={() => {
                setCode('');
                setStep('disable');
              }}
            >
              Turn off two-factor sign-in
            </Button>
          )}
        </div>
      ) : (
        <Button type="button" size="lg" className="w-full" loading={busy} onClick={startSetup}>
          Set up two-factor sign-in
        </Button>
      )}
    </AuthShell>
  );
}

export default function AccountSecurityPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <SecurityPanel />
    </Suspense>
  );
}
