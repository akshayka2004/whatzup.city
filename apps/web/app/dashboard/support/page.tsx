'use client';

import Link from 'next/link';
import {
  ChevronDown,
  CreditCard,
  Flag,
  LifeBuoy,
  Mail,
  ReceiptText,
  ShieldCheck,
} from 'lucide-react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { PageHeader } from '@/components/system/page-header';
import { SectionCard } from '@/components/system/section-card';
import { Button } from '@/components/ui/button';
import { useActiveBusiness } from '@/hooks/use-active-business';
import { Suspense } from 'react';
import { BusinessTickets } from '@/components/support/business-tickets';

const SUPPORT_EMAIL = 'support@lifeartgroup.in';

const FAQ = [
  {
    q: 'My payment proof is uploaded. When does my plan go live?',
    a: 'An admin checks the UPI reference against our account, usually within one working day. You get a notification as soon as it is verified, and your plan dates start from that moment.',
  },
  {
    q: 'A customer uploaded a bill that looks wrong.',
    a: 'Open Bill Queue, pick the bill and choose Reject with a short reason, or Request re-upload if the photo is unreadable. If you suspect fraud, use Flag — it goes to the platform team.',
  },
  {
    q: 'How do I change my opening hours or address?',
    a: 'Settings → Registration & hours. Changes show on your public page right away.',
  },
  {
    q: 'Can I add another outlet of my business?',
    a: 'Yes. Open Outlets and choose Add outlet; each outlet gets its own page and bill queue, and you can switch between them from the header.',
  },
  {
    q: 'How do I give my staff access?',
    a: 'Team → Create account. Moderators can review bills and reviews; analytics and billing stay with the owner.',
  },
];

/**
 * Business help centre: support tickets with the platform team, a pre-filled email fallback
 * with the business id, and answers to the questions owners ask most.
 */
export default function BusinessSupportPage() {
  const { activeBusiness, activeBusinessId } = useActiveBusiness();
  const subject = encodeURIComponent(
    `Support request${activeBusiness?.name ? ` — ${activeBusiness.name}` : ''}`,
  );
  const body = encodeURIComponent(
    `Hi Whtzup.city team,\n\n[Describe what happened, what you expected, and any screenshots]\n\n—\nBusiness: ${activeBusiness?.name ?? ''}\nBusiness ID: ${activeBusinessId ?? ''}\nPage: ${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard\n`,
  );

  return (
    <BusinessLayout>
      <PageHeader
        title="Help & support"
        description="Reach the Whtzup.city team or find a quick answer."
      />

      <div className="mb-6">
        <Suspense fallback={<div className="ui-skeleton h-40 rounded-card" />}>
          <BusinessTickets businessId={activeBusinessId} />
        </Suspense>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <SectionCard
            icon={Mail}
            title="Prefer email?"
            description="We reply within one working day (Mon–Sat, IST)."
          >
            <p className="mb-4 text-body text-muted-foreground">
              The email opens pre-filled with your business ID so we can look things up straight
              away.
            </p>
            <Button asChild size="lg" className="w-full">
              <a href={`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`}>
                <Mail /> Write to {SUPPORT_EMAIL}
              </a>
            </Button>
          </SectionCard>

          <SectionCard
            icon={Flag}
            title="Report a problem with a listing or offer"
            description="Fake businesses, misleading offers, wrong information."
          >
            <Button asChild variant="outline" className="w-full">
              <Link href="/report">Open a report</Link>
            </Button>
          </SectionCard>

          <SectionCard icon={LifeBuoy} title="Shortcuts">
            <div className="grid gap-2">
              {[
                {
                  href: '/dashboard/subscriptions',
                  icon: CreditCard,
                  label: 'Plan, invoices and payment status',
                },
                { href: '/dashboard/moderation', icon: ReceiptText, label: 'Bill queue' },
                { href: '/dashboard/team', icon: ShieldCheck, label: 'Team access' },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="flex h-12 items-center gap-3 rounded-xl border border-border/70 px-3 text-sm font-medium transition-colors hover:border-border-strong hover:bg-secondary"
                >
                  <l.icon className="size-4 text-muted-foreground" aria-hidden />
                  {l.label}
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Common questions" padded={false}>
          <ul className="divide-y divide-border/60">
            {FAQ.map((f) => (
              <li key={f.q}>
                <details className="group px-5 py-4 sm:px-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <p className="mt-2 text-body text-muted-foreground">{f.a}</p>
                </details>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </BusinessLayout>
  );
}
