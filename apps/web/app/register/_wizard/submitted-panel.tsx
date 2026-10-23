'use client';

import Link from 'next/link';
import { ArrowRight, Check, Clock, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RegisterRole } from './shared';

const DASHBOARD: Record<RegisterRole, string> = {
  CUSTOMER: '/',
  BUSINESS: '/dashboard',
  GOVERNMENT: '/government/dashboard',
  NGO_COMMUNITY: '/civic/dashboard',
};

/** Shown once an application is in the review queue: what happens next, and one clear exit. */
export function SubmittedPanel({ role }: { role: RegisterRole }) {
  const steps = [
    { icon: Check, title: 'Application submitted', note: 'We have your details.', state: 'done' },
    {
      icon: Clock,
      title: 'Under review',
      note: 'Our team checks your documents. You can already look around your dashboard.',
      state: 'now',
    },
    {
      icon: Rocket,
      title: role === 'BUSINESS' ? 'Go live' : 'Approved',
      note:
        role === 'BUSINESS'
          ? 'Your listing is published and you can post offers and vouchers.'
          : 'Your account is activated.',
      state: 'next',
    },
  ] as const;

  return (
    <div className="space-y-6 ui-pop" role="status">
      <div className="space-y-1 text-center sm:text-left">
        <h2 className="text-xl font-bold text-foreground">You&apos;re in. Review has started.</h2>
        <p className="text-sm text-muted-foreground">
          We&apos;ll notify you as soon as it is approved. Nothing else is needed from you right
          now.
        </p>
      </div>

      <ol className="space-y-0">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.title} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full border',
                    s.state === 'done' &&
                      'border-success bg-success-soft text-success-soft-foreground',
                    s.state === 'now' && 'border-primary bg-brand-soft text-brand-soft-foreground',
                    s.state === 'next' && 'border-border-strong bg-card text-muted-foreground',
                  )}
                >
                  <Icon className="size-4" />
                </span>
                {i < steps.length - 1 && <span className="my-1 w-px flex-1 bg-border" />}
              </div>
              <div className="pb-5">
                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.note}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <Button asChild className="h-11 w-full rounded-xl px-6 font-semibold sm:w-auto">
        <Link href={DASHBOARD[role]}>
          Go to my dashboard <ArrowRight className="ml-1.5 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
