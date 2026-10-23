'use client';

import Link from 'next/link';
// mock-db removed — all registration flows through real API
import { Button } from '@/components/ui/button';
import {
  User as UserIcon,
  Building2,
  ShieldAlert,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Heart,
  Users,
  Newspaper,
} from 'lucide-react';
import { RegisterRole, CivicOrgType } from './shared';
import type { Wizard } from './use-register-wizard';

export function StepAccountType({ w }: { w: Wizard }) {
  const {
    setCurrentStep,
    role,
    setRole,
    description,
    civicOrgType,
    setCivicOrgType,
    district,
    success,
  } = w;
  return (
    <div className="space-y-6 ui-pop">
      <div className="text-center md:text-left">
        <h2 className="text-xl font-bold text-foreground">How will you use Whtzup.city?</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Tap one to continue. You can change it on the next screen.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ui-fade-up">
        {[
          {
            type: 'CUSTOMER',
            title: 'Customer',
            description:
              'Explore verified business catalogs, post public ratings, claim offer coupons.',
            icon: UserIcon,
            color: 'from-primary/15 to-primary/5 hover:border-border',
            iconColor: 'text-brand-soft-foreground',
          },
          {
            type: 'BUSINESS',
            title: 'Company / Business',
            description:
              'List your business, post offers and vouchers, and see how customers respond.',
            icon: Building2,
            color: 'from-info/15 to-info/5 hover:border-info/25',
            iconColor: 'text-info-soft-foreground',
          },
          {
            type: 'GOVERNMENT',
            title: 'Govt Body',
            description:
              'Publish administrative alerts, notices, and manage district announcements.',
            icon: ShieldAlert,
            color: 'from-warning/15 to-warning/5 hover:border-warning/30',
            iconColor: 'text-warning-soft-foreground',
          },
          {
            type: 'NGO_COMMUNITY',
            title: 'NGO / Community',
            description:
              'Register NGOs, community groups, and news forums. Publish notices and alerts.',
            icon: Heart,
            color: 'from-destructive/15 to-destructive/5 hover:border-destructive/25',
            iconColor: 'text-danger-soft-foreground',
          },
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = role === item.type;
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => {
                setRole(item.type as RegisterRole);
                // One tap is enough, except for organisations, which still pick their type below.
                if (item.type !== 'NGO_COMMUNITY') setCurrentStep(2);
              }}
              className={`p-4 sm:p-5 rounded-2xl border text-left bg-gradient-to-b ${item.color} transition cursor-pointer flex flex-col gap-3 relative ${
                isSelected ? 'border-white scale-[1.02] shadow-xl' : 'border-border'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="p-2.5 rounded-xl bg-background">
                  <Icon className={`h-5 w-5 ${item.iconColor}`} />
                </div>
                {isSelected && (
                  <span className="p-1 rounded-full bg-success-soft border border-success/25 text-success-soft-foreground">
                    <CheckCircle className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-1 text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Civic org sub-type selector */}
      {role === 'NGO_COMMUNITY' && (
        <div className="p-4 rounded-xl bg-danger-soft border border-destructive/25 space-y-3">
          <p className="text-xs font-semibold text-danger-soft-foreground">
            Select Organisation Type
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'NGO', label: 'NGO', icon: Heart, desc: 'Non-Governmental' },
              { value: 'COMMUNITY', label: 'Community', icon: Users, desc: 'Community Group' },
              { value: 'NEWS_FORUM', label: 'News Forum', icon: Newspaper, desc: 'Media / Press' },
            ].map(({ value, label, icon: OIcon, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setCivicOrgType(value as CivicOrgType)}
                className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 cursor-pointer transition ${
                  civicOrgType === value
                    ? 'border-destructive/25 bg-danger-soft text-danger-soft-foreground'
                    : 'border-border text-muted-foreground hover:border-destructive/25'
                }`}
              >
                <OIcon className="h-4 w-4" />
                <span className="text-xs font-semibold">{label}</span>
                <span className="text-xs opacity-60">{desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-4 border-t border-border">
        <Link
          href="/login"
          className="text-muted-foreground hover:text-foreground text-sm font-semibold flex items-center justify-center sm:justify-start gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </Link>

        {role === 'NGO_COMMUNITY' && (
          <Button
            onClick={() => setCurrentStep(2)}
            className="rounded-xl h-11 px-6 font-semibold hover:opacity-90 transition-opacity w-full sm:w-auto"
          >
            Continue <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
