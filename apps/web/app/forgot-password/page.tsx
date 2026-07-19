'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { apiService } from '@/lib/services/api-service';
import { Mail, Loader2, ArrowRight, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';

/* Palette (shared with the login page) */
const C = {
  bg: '#2F2C36',
  surface2: '#46444F',
  accent: '#8A6A63',
  accentHover: '#A67C73',
  heading: '#F4F5F7',
  para: '#B7B8C3',
  border: 'rgba(255,255,255,0.06)',
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiService.post('/v1/auth/forgot-password', { email });
      if (res.error) {
        setError(res.error);
      } else {
        // Backend always returns a generic message (no account harvesting)
        setSent(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBase =
    'lp-input w-full h-[54px] rounded-2xl pl-11 pr-4 text-sm outline-none transition-all duration-200';

  return (
    <div className="lp-root flex min-h-screen w-full items-center justify-center p-4 sm:p-6 md:p-8" style={{ background: C.bg }}>
      <div
        className="w-full max-w-md rounded-[28px] p-8 md:p-10"
        style={{ background: C.surface2, border: `1px solid ${C.border}`, boxShadow: '0 40px 120px rgba(0,0,0,0.5)' }}
      >
        {/* Floating icon */}
        <div className="mb-6 flex justify-center">
          <div
            className="lp-float flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, boxShadow: '0 0 40px rgba(166,124,115,0.25)' }}
          >
            {sent ? (
              <CheckCircle2 className="h-7 w-7" style={{ color: '#6ee7b7' }} />
            ) : (
              <KeyRound className="h-7 w-7" style={{ color: C.accentHover }} />
            )}
          </div>
        </div>

        {sent ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold" style={{ color: C.heading }}>Check your email</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed" style={{ color: C.para }}>
              If an account exists for <span style={{ color: C.heading }}>{email}</span>, we&apos;ve sent a
              password reset link. It expires in 1 hour.
            </p>
            <Link
              href="/login"
              className="mt-7 inline-flex items-center justify-center gap-2 text-sm font-semibold"
              style={{ color: C.accentHover }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold" style={{ color: C.heading }}>Forgot password?</h1>
              <p className="mt-1 text-sm" style={{ color: C.para }}>
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 rounded-xl p-3 text-xs font-medium"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', color: '#fca5a5' }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium" style={{ color: C.para }}>Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'rgba(183,184,195,0.5)' }} />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputBase}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="lp-cta flex h-[56px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                style={{ color: '#fff' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    Send reset link
                    <ArrowRight className="lp-arrow h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-7 text-center text-sm" style={{ color: C.para }}>
              Remember your password?{' '}
              <Link href="/login" className="lp-reg font-semibold" style={{ color: C.accentHover }}>
                Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
