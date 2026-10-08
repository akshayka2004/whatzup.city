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
    color: 'from-primary/15 to-primary/5 hover:to-primary/5',
    borderColor: 'border-primary/25 hover:border-primary/25',
    badgeColor: 'bg-brand-soft text-brand-soft-foreground',
    iconColor: 'text-brand-soft-foreground',
  },
  {
    entityType: 'BUSINESS',
    role: 'BUSINESS_OWNER',
    title: 'Business / Organisation',
    description: 'List your business, manage inventory and offers, verify bills, and grow your customer base.',
    icon: Building2,
    color: 'from-info/15 to-info/5 hover:to-info/5',
    borderColor: 'border-info/25 hover:border-info/25',
    badgeColor: 'bg-info-soft text-info-soft-foreground',
    iconColor: 'text-info-soft-foreground',
  },
  {
    entityType: 'GOVERNMENT',
    role: 'GOVERNMENT_ADMIN',
    title: 'Government / Public Sector',
    description: 'Issue official alerts, publish civic announcements, and manage district notifications.',
    icon: ShieldAlert,
    color: 'from-warning/15 to-warning/5 hover:to-warning/5',
    borderColor: 'border-warning/30 hover:border-warning/30',
    badgeColor: 'bg-warning-soft text-warning-soft-foreground',
    iconColor: 'text-warning-soft-foreground',
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
          router.push(`/register`);
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
      router.push('/register');
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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-soft border border-primary/25 text-brand-soft-foreground text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            Welcome — Choose Your Path
          </div>
          <h1 className="text-foreground text-3xl md:text-4xl font-extrabold tracking-tight">
            How will you use{' '}
            <span className="bg-gradient-to-r from-primary via-info/80 to-primary/70 bg-clip-text text-transparent">
              the platform?
            </span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Select your account type. Your dashboard and permissions are tailored to your role.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-danger-soft border border-destructive/25 text-danger-soft-foreground text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleContinue} className="space-y-6">
          {/* Role cards */}
          <div className="grid md:grid-cols-3 gap-4 ui-fade-up">
            {ROLES.map((option) => {
              const Icon = option.icon;
              const selected = selectedType === option.entityType;
              return (
                <button
                  key={option.entityType}
                  type="button"
                  onClick={() => { setSelectedType(option.entityType); setError(''); }}
                  className={`p-6 rounded-2xl border bg-gradient-to-b ${option.color} text-left transition-all duration-200 cursor-pointer flex flex-col gap-4 relative ui-press ${
                    selected ? 'border-white scale-[1.02] shadow-xl' : option.borderColor
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl ${selected ? 'bg-secondary' : 'bg-background'} transition`}>
                      <Icon className={`h-6 w-6 ${option.iconColor}`} />
                    </div>
                    {selected ? (
                      <span className="p-1 rounded-full bg-success-soft border border-success/25 text-success-soft-foreground">
                        <CheckCircle className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${option.badgeColor}`}>
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
            <Card className="bg-card border border-border p-6 rounded-2xl space-y-4 ui-pop">
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
                className="w-full h-11 bg-gradient-to-r from-primary/15 to-info/5 hover:opacity-90 text-white rounded-xl font-semibold cursor-pointer flex items-center justify-center gap-2"
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
