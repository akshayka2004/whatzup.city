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
} from 'lucide-react';

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();

  // Form states
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
    <div className="min-h-screen w-full bg-[#070709] text-slate-100 flex items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans">
      {/* Dynamic ambient backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-violet-600/10 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="w-full max-w-5xl grid lg:grid-cols-12 gap-8 items-stretch relative z-10">
        {/* Left Side: Brand Panel */}
        <div className="lg:col-span-6 flex flex-col justify-between p-8 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-md relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-gradient-to-br from-violet-600 to-cyan-500 opacity-20 rounded-full blur-3xl"></div>

          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold tracking-wide">
              <Sparkles className="h-3.5 w-3.5" />
              SaaS Directory Portal
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                One Platform, <br />
                <span className="bg-gradient-to-r from-violet-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
                  Connected.
                </span>
              </h1>
              <p className="text-slate-400 max-w-md text-base leading-relaxed">
                Log in to discover local services, claim exclusive offers, and publish civic updates with verified credentials.
              </p>
            </div>

            {/* Features list */}
            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-200">Integrated Services</h4>
                  <p className="text-xs text-slate-400">
                    A single unified space for customer reviews, business listings, and government notifications.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-200">Kerala District-wide Reach</h4>
                  <p className="text-xs text-slate-400">
                    Specifically tailored administrative coverages for businesses and government sectors.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-200">Verified Credentials</h4>
                  <p className="text-xs text-slate-400">
                    Enhanced legitimacy with certificate verification and official department status checks.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Brand Footer */}
          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
            <span>© {new Date().getFullYear()} SaaS Directory Portal.</span>
            <span>All rights reserved.</span>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="lg:col-span-6 flex flex-col justify-center">
          <Card className="p-8 bg-[#0d0d11]/70 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-100">Welcome Back</h2>
              <p className="text-sm text-slate-400 mt-1">
                Enter your credentials to access your dashboard.
              </p>
            </div>

            {/* Error & Success Banners */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-white/5 border-white/10 text-sm text-slate-100 rounded-xl focus:border-violet-500/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-slate-300">Password</label>
                </div>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-white/5 border-white/10 text-sm text-slate-100 rounded-xl focus:border-violet-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 font-semibold rounded-xl text-sm transition-all duration-300 cursor-pointer bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 text-center text-sm text-slate-400">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-violet-400 hover:text-violet-300 font-semibold hover:underline">
                Register here
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
