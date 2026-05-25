'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Key,
  Mail,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  MapPin,
  Tag,
  Bell,
} from 'lucide-react';

/* Brand panel feature list */
const BRAND_FEATURES = [
  {
    icon: CheckCircle2,
    title: 'Integrated Services',
    desc: 'Unified space for reviews, business listings, and government notifications.',
  },
  {
    icon: MapPin,
    title: 'Kerala District-wide Reach',
    desc: 'Tailored administrative coverage for businesses and government sectors.',
  },
  {
    icon: Tag,
    title: 'Verified Credentials',
    desc: 'Certificate verification and official department status checks.',
  },
];

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      if (!email || !password) {
        setError('Please fill in all fields.');
        setIsSubmitting(false);
        return;
      }
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

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans"
      style={{ backgroundColor: '#37353E' }}
    >
      {/* Ambient blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full blur-[140px] pointer-events-none"
           style={{ background: 'rgba(113,90,90,0.08)' }} />
      <div className="absolute bottom-[-15%] right-[-5%] w-[45%] h-[45%] rounded-full blur-[120px] pointer-events-none"
           style={{ background: 'rgba(113,90,90,0.06)' }} />

      {/* Mobile brand badge */}
      <div className="absolute top-5 left-0 right-0 flex justify-center lg:hidden z-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold tracking-wide"
             style={{ background: 'rgba(68,68,78,0.6)', borderColor: 'rgba(113,90,90,0.25)', color: '#D3DAD9' }}>
          <img src="/logo.png" alt="Whtzup.city Logo" className="h-9 w-auto object-contain" />
          <span className="font-semibold tracking-tight">whtzup.city</span>
        </div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch relative z-10">

        {/* ── Brand Panel (desktop only) ── */}
        <div
          className="hidden lg:flex lg:col-span-6 flex-col justify-between p-9 rounded-2xl relative overflow-hidden"
          style={{ background: '#44444E', border: '1px solid rgba(211,218,217,0.08)' }}
        >
          {/* Decorative blob */}
          <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full blur-3xl pointer-events-none"
               style={{ background: 'rgba(113,90,90,0.15)' }} />

          <div className="space-y-7 relative">
            {/* Brand badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold tracking-wide w-fit"
                 style={{ background: 'rgba(113,90,90,0.15)', borderColor: 'rgba(113,90,90,0.30)', color: '#D3DAD9' }}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: '#715A5A' }} />
              Whtzup.city
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight"
                  style={{ color: '#D3DAD9' }}>
                One Platform,<br />
                <span style={{ color: '#715A5A' }}>Connected.</span>
              </h1>
              <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'rgba(211,218,217,0.65)' }}>
                Log in to discover local services, claim exclusive offers, and publish civic updates with verified credentials.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4">
              {BRAND_FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg shrink-0 mt-0.5"
                         style={{ background: 'rgba(113,90,90,0.15)', border: '1px solid rgba(113,90,90,0.25)' }}>
                      <Icon className="h-4 w-4" style={{ color: '#715A5A' }} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm" style={{ color: '#D3DAD9' }}>{f.title}</h4>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(211,218,217,0.55)' }}>
                        {f.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Brand footer */}
          <div className="mt-8 pt-5 flex items-center justify-between text-xs"
               style={{ borderTop: '1px solid rgba(211,218,217,0.08)', color: 'rgba(211,218,217,0.40)' }}>
            <span>© {new Date().getFullYear()} Whtzup.city.</span>
            <span>All rights reserved.</span>
          </div>
        </div>

        {/* ── Login Form ── */}
        <div className="lg:col-span-6 flex flex-col justify-center pt-14 lg:pt-0">
          <div
            className="p-7 md:p-8 rounded-2xl relative overflow-hidden shadow-2xl"
            style={{ background: 'rgba(68,68,78,0.85)', border: '1px solid rgba(211,218,217,0.07)' }}
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#D3DAD9' }}>Welcome Back</h2>
              <p className="text-sm mt-1" style={{ color: 'rgba(211,218,217,0.55)' }}>
                Enter your credentials to access your dashboard.
              </p>
            </div>

            {/* Banners */}
            {error && (
              <div className="mb-4 p-3 rounded-xl text-xs font-medium"
                   style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', color: '#fca5a5' }}>
                {error}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 rounded-xl text-xs font-medium"
                   style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.20)', color: '#6ee7b7' }}>
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: 'rgba(211,218,217,0.75)' }}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                        style={{ color: 'rgba(211,218,217,0.35)' }} />
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 text-sm rounded-xl"
                    style={{
                      background: 'rgba(55,53,62,0.70)',
                      border: '1px solid rgba(211,218,217,0.10)',
                      color: '#D3DAD9',
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: 'rgba(211,218,217,0.75)' }}>
                  Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                       style={{ color: 'rgba(211,218,217,0.35)' }} />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 text-sm rounded-xl"
                    style={{
                      background: 'rgba(55,53,62,0.70)',
                      border: '1px solid rgba(211,218,217,0.10)',
                      color: '#D3DAD9',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ color: 'rgba(211,218,217,0.40)' }}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 font-semibold rounded-xl text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 mt-2"
                style={{ background: '#715A5A', color: '#D3DAD9' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-7 text-center text-sm" style={{ color: 'rgba(211,218,217,0.50)' }}>
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="font-semibold hover:underline transition-colors"
                style={{ color: '#D3DAD9' }}
              >
                Register here
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
