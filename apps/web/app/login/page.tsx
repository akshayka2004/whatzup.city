'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  Building2,
  ShieldCheck,
  Store,
} from 'lucide-react';

/* ─── Palette (from design spec) ─────────────────────────────── */
const C = {
  bg: '#2F2C36',
  surface: '#3B3943',
  surface2: '#46444F',
  accent: '#8A6A63',
  accentHover: '#A67C73',
  heading: '#F4F5F7',
  para: '#B7B8C3',
  border: 'rgba(255,255,255,0.06)',
};

/* ─── Left-panel feature rows ────────────────────────────────── */
const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Verified & Trusted',
    desc: 'Certificate verification and official department status checks.',
  },
  {
    icon: Store,
    title: 'Local Businesses & Offers',
    desc: 'Discover verified businesses and claim exclusive local deals.',
  },
  {
    icon: Building2,
    title: 'Government & Civic Services',
    desc: 'Community updates and public services, all in one place.',
  },
];

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      const success = await signIn(email, password);
      if (!success) {
        setError('Invalid email or password.');
      } else {
        setSuccessMsg('Logged in successfully!');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBase =
    'lp-input w-full h-[54px] rounded-2xl pl-11 pr-11 text-sm outline-none transition-all duration-200';

  return (
    <div className="lp-root min-h-screen w-full p-4 sm:p-6 md:p-8" style={{ background: C.bg }}>
      {/* One elegant rounded glass container holding both panels */}
      <div
        className="mx-auto grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-[28px] lg:grid-cols-[58%_42%]"
        style={{
          minHeight: 'calc(100vh - 64px)',
          background: C.surface,
          border: `1px solid ${C.border}`,
          boxShadow: '0 40px 120px rgba(0,0,0,0.5)',
        }}
      >
        {/* ── Left panel ─────────────────────────────────────── */}
        <section className="relative overflow-hidden flex flex-col justify-center p-8 md:p-10 lg:p-12 min-h-[300px]">
          {/* Cinematic city background (lower half) + gradient fade */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="lp-hero-img absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: 'url(/login-hero.png)' }}
            />
            {/* Top fade into dark so text stays readable */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, ${C.surface} 0%, rgba(47,44,54,0.72) 38%, rgba(47,44,54,0.35) 70%, rgba(47,44,54,0.85) 100%)`,
              }}
            />
            {/* Subtle floating network nodes echoing the skyline links */}
            {[
              { top: '18%', left: '20%', d: '0s' },
              { top: '26%', left: '48%', d: '1.2s' },
              { top: '14%', left: '70%', d: '2.1s' },
              { top: '34%', left: '82%', d: '0.6s' },
              { top: '40%', left: '34%', d: '1.8s' },
            ].map((n, i) => (
              <span
                key={i}
                className="lp-node absolute h-1.5 w-1.5 rounded-full"
                style={{ top: n.top, left: n.left, background: C.accentHover, animationDelay: n.d }}
              />
            ))}
          </div>

          {/* Foreground content */}
          <div className="relative z-10">
            {/* Logo pill */}
            <div
              className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide"
              style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: C.para }}
            >
              <img src="/logo.png" alt="Whtzup.city" className="h-5 w-auto object-contain" />
              <span className="tracking-tight" style={{ color: C.heading }}>whtzup.city</span>
            </div>

            <div className="mt-8 max-w-md">
              <h1
                className="font-extrabold leading-[1.05] tracking-tight text-[40px] sm:text-[52px] lg:text-[64px]"
                style={{ color: C.heading }}
              >
                One Platform,
                <br />
                <span style={{ color: C.accent }}>Connected.</span>
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-relaxed" style={{ color: C.para }}>
                Access verified businesses, government services, community updates,
                and exclusive local offers — all from one trusted platform.
              </p>
            </div>

            {/* Feature rows */}
            <div className="mt-8 space-y-2">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="lp-feature flex items-start gap-3 rounded-2xl p-3">
                    <div
                      className="mt-0.5 shrink-0 rounded-xl p-2"
                      style={{
                        background: 'linear-gradient(135deg, rgba(138,106,99,0.25), rgba(166,124,115,0.15))',
                        border: `1px solid ${C.border}`,
                      }}
                    >
                      <Icon className="h-4 w-4" style={{ color: C.accentHover }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold" style={{ color: C.heading }}>{f.title}</h4>
                      <p className="mt-0.5 text-xs leading-relaxed" style={{ color: C.para }}>{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </section>

        {/* ── Right panel (form) ─────────────────────────────── */}
        <section
          className="lp-card flex flex-col justify-center p-8 md:p-10 lg:p-12"
          style={{ background: C.surface2, borderLeft: `1px solid ${C.border}` }}
        >
          <div className="mx-auto w-full max-w-sm">
            {/* Floating icon */}
            <div className="mb-6 flex justify-center">
              <div
                className="lp-float flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${C.border}`,
                  boxShadow: '0 0 40px rgba(166,124,115,0.25)',
                }}
              >
                <Building2 className="h-7 w-7" style={{ color: C.accentHover }} />
              </div>
            </div>

            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold" style={{ color: C.heading }}>Welcome Back</h2>
              <p className="mt-1 text-sm" style={{ color: C.para }}>Sign in to continue to your dashboard.</p>
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
            {successMsg && (
              <div
                role="status"
                className="mb-4 rounded-xl p-3 text-xs font-medium"
                style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.20)', color: '#6ee7b7' }}
              >
                {successMsg}
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

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-medium" style={{ color: C.para }}>Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'rgba(183,184,195,0.5)' }} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputBase}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer transition-opacity hover:opacity-80"
                    style={{ color: 'rgba(183,184,195,0.55)' }}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex cursor-pointer items-center gap-2 select-none" style={{ color: C.para }}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded"
                    style={{ accentColor: C.accent }}
                  />
                  Remember me
                </label>
                <Link href="/forgot-password" className="lp-reg font-medium" style={{ color: C.accentHover }}>
                  Forgot password?
                </Link>
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
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="lp-arrow h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-7 text-center text-sm" style={{ color: C.para }}>
              Don&apos;t have an account?{' '}
              <Link href="/register" className="lp-reg font-semibold" style={{ color: C.accentHover }}>
                Register Here
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
