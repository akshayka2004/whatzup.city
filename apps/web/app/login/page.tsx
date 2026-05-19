'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Key,
  Mail,
  User as UserIcon,
  Building2,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

export default function LoginPage() {
  const { signIn, switchRole } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!email || !password) {
      setError('Please fill in all fields.');
      setIsSubmitting(false);
      return;
    }

    const success = await signIn(email, password);
    if (!success) {
      setError('Invalid credentials. Hint: use password123');
      setIsSubmitting(false);
    }
  };

  const roleDemos = [
    {
      role: 'user' as const,
      name: 'Public User',
      email: 'user@platform.com',
      desc: 'Browse businesses, write reviews, grab deals.',
      icon: UserIcon,
      color:
        'from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/10',
    },
    {
      role: 'business' as const,
      name: 'Business Owner',
      email: 'business@platform.com',
      desc: 'Manage profile, listings, offers, & analytics.',
      icon: Building2,
      color:
        'from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/10',
    },
    {
      role: 'admin' as const,
      name: 'Admin Moderator',
      email: 'admin@platform.com',
      desc: 'Handle listings approvals, user reports, and categories.',
      icon: ShieldAlert,
      color:
        'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/10',
    },
    {
      role: 'super-admin' as const,
      name: 'Super Admin',
      email: 'superadmin@platform.com',
      desc: 'System health monitoring, tenants, & security log.',
      icon: ShieldCheck,
      color:
        'from-rose-500/20 to-pink-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/10',
    },
  ];

  return (
    <div className="min-h-screen w-full bg-[#0a0a0c] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-5xl grid md:grid-cols-12 gap-8 items-stretch relative z-10">
        {/* Left Side: Info & Quick Switchers */}
        <div className="md:col-span-7 flex flex-col justify-center space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              Enterprise Platform
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
              Explore Every Dimension of the Platform
            </h1>
            <p className="text-slate-400 max-w-md text-base leading-relaxed">
              Log in to access role-specific portals. Switch instantly using our quick-login buttons
              below.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {roleDemos.map((demo) => {
              const Icon = demo.icon;
              return (
                <button
                  key={demo.role}
                  onClick={() => switchRole(demo.role)}
                  className={`p-5 rounded-2xl border bg-gradient-to-br text-left transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg ${demo.color} flex flex-col justify-between h-44 cursor-pointer`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs opacity-65 font-mono">Demo Account</span>
                    </div>
                    <h3 className="font-bold text-lg text-slate-100">{demo.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {demo.desc}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-medium font-mono text-slate-300 truncate max-w-[150px]">
                      {demo.email}
                    </span>
                    <span className="text-xs font-semibold underline decoration-dotted">
                      Quick Login →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Traditional Login Form */}
        <div className="md:col-span-5 flex flex-col justify-center">
          <Card className="p-8 bg-card/60 backdrop-blur-xl border-white/5 rounded-3xl shadow-2xl relative">
            <div className="absolute top-0 right-0 p-3 text-xs font-mono text-slate-500 bg-white/5 rounded-bl-2xl rounded-tr-3xl">
              v1.0.0
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-100 mb-1">Sign In</h2>
              <p className="text-sm text-slate-400">Enter your credentials to continue</p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-12 bg-white/5 border-white/10 text-slate-100 placeholder-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-300 block">Password</label>
                  <span className="text-xs text-primary/70 font-mono">password123</span>
                </div>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 pr-10 h-12 bg-white/5 border-white/10 text-slate-100 placeholder-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-semibold rounded-xl transition-all duration-300"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-8 text-center text-xs text-slate-500 font-medium">
              Demo passwords are all{' '}
              <code className="px-1.5 py-0.5 bg-white/5 rounded text-primary font-mono font-semibold">
                password123
              </code>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
