'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  User as UserIcon,
  Building2,
  ShieldAlert,
  Loader2,
  ArrowRight,
  CheckCircle,
  Sparkles,
} from 'lucide-react';

interface RoleOption {
  entityType: string;
  role: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  borderColor: string;
  badgeColor: string;
  iconColor: string;
}

const ROLES: RoleOption[] = [
  {
    entityType: 'CUSTOMER',
    role: 'USER',
    title: 'Customer',
    description: 'Discover local businesses, claim offers, submit bills, and leave reviews.',
    icon: UserIcon,
    color: 'from-violet-600/20 to-violet-500/5 hover:to-violet-600/10',
    borderColor: 'border-violet-500/20 hover:border-violet-500/50',
    badgeColor: 'bg-violet-500/10 text-violet-400',
    iconColor: 'text-violet-400',
  },
  {
    entityType: 'BUSINESS',
    role: 'BUSINESS_OWNER',
    title: 'Business / Organisation',
    description: 'List your business, manage inventory and offers, verify bills, and grow your customer base.',
    icon: Building2,
    color: 'from-cyan-600/20 to-cyan-500/5 hover:to-cyan-600/10',
    borderColor: 'border-cyan-500/20 hover:border-cyan-500/50',
    badgeColor: 'bg-cyan-500/10 text-cyan-400',
    iconColor: 'text-cyan-400',
  },
  {
    entityType: 'GOVERNMENT',
    role: 'GOVERNMENT_ADMIN',
    title: 'Government / Public Sector',
    description: 'Issue official alerts, publish civic announcements, and manage district notifications.',
    icon: ShieldAlert,
    color: 'from-amber-600/20 to-amber-500/5 hover:to-amber-600/10',
    borderColor: 'border-amber-500/20 hover:border-amber-500/50',
    badgeColor: 'bg-amber-500/10 text-amber-400',
    iconColor: 'text-amber-400',
  },
];

export default function SelectRolePage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) {
      setError('Select a role to continue.');
      return;
    }
    setLoading(true);
    setError('');

    const option = ROLES.find((r) => r.entityType === selectedType)!;

    // Try API; always fall back gracefully
    try {
      const res = await fetch('/api/v1/auth/select-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: option.role, entityType: option.entityType, name, phone }),
      });
      if (res.ok) {
        const data = await res.json();
        if (option.entityType === 'BUSINESS' && data.businessId) {
          router.push(`/register/business?id=${data.businessId}`);
          return;
        }
      }
    } catch (_) {}

    // Client-side mock fallback — update localStorage user session
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user_session') || localStorage.getItem('user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.rbacRole = option.role;
          if (name) parsed.name = name;
          localStorage.setItem('user_session', JSON.stringify(parsed));
          localStorage.setItem('user', JSON.stringify(parsed));
        } catch (_) {}
      }
    }

    // Redirect
    if (option.entityType === 'CUSTOMER') {
      router.push('/');
    } else if (option.entityType === 'BUSINESS') {
      router.push('/register/business?id=mock-biz-001');
    } else if (option.entityType === 'GOVERNMENT') {
      router.push('/government/dashboard');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center py-12 px-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[160px] pointer-events-none" style={{ background: 'rgba(113,90,90,0.08)' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] pointer-events-none" style={{ background: 'rgba(113,90,90,0.06)' }} />

      <div className="max-w-3xl w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            Welcome — Choose Your Path
          </div>
          <h1 className="text-foregroundxl md:text-4xl font-extrabold tracking-tight">
            How will you use{' '}
            <span className="bg-gradient-to-r from-violet-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
              the platform?
            </span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Select your account type. Your dashboard and permissions are tailored to your role.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleContinue} className="space-y-6">
          {/* Role cards */}
          <div className="grid md:grid-cols-3 gap-4">
            {ROLES.map((option) => {
              const Icon = option.icon;
              const selected = selectedType === option.entityType;
              return (
                <button
                  key={option.entityType}
                  type="button"
                  onClick={() => { setSelectedType(option.entityType); setError(''); }}
                  className={`p-6 rounded-2xl border bg-gradient-to-b ${option.color} text-left transition-all duration-200 cursor-pointer flex flex-col gap-4 relative ${
                    selected ? 'border-white scale-[1.02] shadow-xl' : option.borderColor
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl ${selected ? 'bg-secondary' : 'bg-background'} transition`}>
                      <Icon className={`h-6 w-6 ${option.iconColor}`} />
                    </div>
                    {selected ? (
                      <span className="p-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                        <CheckCircle className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${option.badgeColor}`}>
                        {option.entityType}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">{option.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Extra fields once role selected */}
          {selectedType && (
            <Card className="bg-card/80 backdrop-blur-xl border border-border p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-foreground">Additional Details (optional)</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    {selectedType === 'BUSINESS' ? 'Business Name' : selectedType === 'GOVERNMENT' ? 'Department Name' : 'Your Name'}
                  </label>
                  <Input
                    placeholder={selectedType === 'BUSINESS' ? 'Sunrise Café' : selectedType === 'GOVERNMENT' ? 'Public Safety Dept.' : 'Jane Doe'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-background border-input text-sm text-foreground rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Phone Number</label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-background border-input text-sm text-foreground rounded-xl"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 text-white rounded-xl font-semibold cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Setting up profile...</>
                ) : (
                  <><span>Continue</span><ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </Card>
          )}
        </form>
      </div>
    </div>
  );
}
