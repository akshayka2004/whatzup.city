'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, Phone } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { authService } from '@/lib/services/auth-service';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { AuthField, FormAlert } from '@/components/auth/auth-shell';

const link = 'text-label text-primary underline-offset-4 hover:underline disabled:opacity-60';

/** Sign in with a mobile number and a 6-digit SMS code. */
export function OtpLoginForm({ redirectTo }: { redirectTo?: string }) {
  const { signInWithOtp } = useAuth();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Resend countdown.
  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    if (!/^\d{10}$/.test(phone)) {
      setPhoneError('Enter your 10-digit mobile number.');
      return;
    }
    setPhoneError('');
    setBusy(true);
    try {
      const { resendIn } = await authService.requestOtp(phone);
      setCode('');
      setWait(resendIn);
      setStep('code');
    } catch (err: any) {
      setError(err?.message || "We couldn't send the code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    if (value.length !== 6 || busy) return;
    setError('');
    setBusy(true);
    try {
      const ok = await signInWithOtp(phone, value, redirectTo);
      if (!ok) setError('That code did not work. Request a new one.');
    } catch (err: any) {
      setCode('');
      setError(err?.message || "We couldn't sign you in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (step === 'phone') {
    return (
      <form onSubmit={send} className="space-y-4" noValidate>
        {error && <FormAlert tone="error">{error}</FormAlert>}
        <AuthField
          label="Mobile number"
          name="phone"
          type="tel"
          icon={Phone}
          autoComplete="tel-national"
          inputMode="numeric"
          enterKeyHint="send"
          placeholder="10-digit number"
          maxLength={10}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          error={phoneError}
          hint="We text a 6-digit code to the number on your account."
        />
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Send code <ArrowRight />
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      {error && <FormAlert tone="error">{error}</FormAlert>}
      <div className="space-y-1">
        <p className="text-sm text-foreground">
          If <span className="font-semibold">+91 ••••• ••{phone.slice(-3)}</span> is on an account,
          a 6-digit code is on its way.
        </p>
        <p className="text-xs text-muted-foreground">It works for 5 minutes.</p>
      </div>

      <InputOTP
        maxLength={6}
        value={code}
        onChange={setCode}
        onComplete={verify}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        disabled={busy}
        aria-label="6-digit code"
      >
        <InputOTPGroup>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <InputOTPSlot key={i} index={i} className="size-11 text-base" />
          ))}
        </InputOTPGroup>
      </InputOTP>

      <Button
        type="button"
        size="lg"
        className="w-full"
        loading={busy}
        disabled={code.length !== 6}
        onClick={() => verify(code)}
      >
        Sign in <ArrowRight />
      </Button>

      <div className="flex items-center justify-between">
        <button type="button" className={link} onClick={() => setStep('phone')} disabled={busy}>
          Change number
        </button>
        <button type="button" className={link} onClick={() => send()} disabled={busy || wait > 0}>
          {wait > 0 ? `Resend in ${wait}s` : 'Resend code'}
        </button>
      </div>
    </div>
  );
}
