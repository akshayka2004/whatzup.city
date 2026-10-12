'use client';

/**
 * Plan prompts for business owners. Nothing here blocks the dashboard any more.
 *
 * - SubscriptionPaywall: a small, dismissible upsell card shown while the business is on the
 *   permanent Free listing.
 * - RenewalReminder: a slim banner shown when a paid plan is about to end
 *   (3 days for monthly, 5 days for yearly and everything else).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Clock, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEntitlements } from '@/hooks/use-entitlements';

// Pages that already carry their own plan messaging (or are the plan pages themselves).
const UPSELL_HIDDEN_ON = [
  '/dashboard/support',
  '/dashboard/subscriptions',
  '/dashboard/invoice',
  '/dashboard/outlets',
  '/dashboard/offers',
  '/dashboard/vouchers',
  '/dashboard/analytics',
];

const upsellKey = (id: string) => `plan_upsell_dismissed_${id}`;
/** Shared with BusinessNudges so a dismissed reminder frees the "one prompt" slot. */
export const renewalDismissKey = (id: string) => `renewal_nudge_dismissed_${id}`;

function readSession(key: string): boolean {
  try {
    return !!sessionStorage.getItem(key);
  } catch {
    return false;
  }
}
function writeSession(key: string) {
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    // storage blocked: dismissal lasts until the next render only
  }
}

/** Whole days until the soonest paid row ends; null when there is nothing to renew. */
export function daysUntilRenewal(
  ent: { source: string; expiresAt: string | null; cycle?: string | null } | null,
): { days: number; threshold: number } | null {
  if (!ent || ent.source === 'FREE' || !ent.expiresAt) return null;
  const days = Math.ceil((new Date(ent.expiresAt).getTime() - Date.now()) / 86_400_000);
  if (Number.isNaN(days)) return null;
  const threshold = ent.cycle === 'MONTHLY' ? 3 : 5;
  return { days, threshold };
}

export function SubscriptionPaywall() {
  const pathname = usePathname();
  const { ent, loading } = useEntitlements();
  const id = ent?.businessId;
  // Start hidden so a previously dismissed card never flashes.
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (id) setHidden(readSession(upsellKey(id)));
  }, [id]);

  if (loading || !ent || !id || hidden || ent.source !== 'FREE') return null;
  if (UPSELL_HIDDEN_ON.some((p) => pathname?.startsWith(p)) || pathname === '/dashboard') {
    return null;
  }

  return (
    <div className="print:hidden container mx-auto px-4 pt-4 ui-fade-up">
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground">
          <Sparkles className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">You are on the Free listing</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Free keeps 1 offer live. Paid plans add more offers, vouchers and analytics.
          </p>
          <Button asChild size="sm" className="mt-2.5 h-10 rounded-xl px-4 cursor-pointer ui-press">
            <Link href="/dashboard/subscriptions">
              See plans <ArrowRight />
            </Link>
          </Button>
        </div>
        <button
          type="button"
          onClick={() => {
            writeSession(upsellKey(id));
            setHidden(true);
          }}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Slim banner for the top of the app shell. Renders nothing unless a paid plan ends soon. */
export function RenewalReminder() {
  const { ent } = useEntitlements();
  const id = ent?.businessId;
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (id) setHidden(readSession(renewalDismissKey(id)));
  }, [id]);

  const due = daysUntilRenewal(ent);
  if (!ent || !id || hidden || !due || due.days > due.threshold) return null;

  const text =
    due.days < 0
      ? 'Your plan has ended.'
      : due.days === 0
        ? 'Your plan ends today.'
        : `Your plan ends in ${due.days} day${due.days === 1 ? '' : 's'}.`;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-warning/25 bg-warning-soft px-4 py-2.5 text-sm text-warning-soft-foreground sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <Clock className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0">
          <strong className="font-semibold">{text}</strong>{' '}
          <span className="hidden sm:inline">
            Renew to keep your offers and vouchers live; otherwise extras are paused.
          </span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button asChild size="sm" variant="outline">
          <Link href="/dashboard/subscriptions">
            Renew <ArrowRight />
          </Link>
        </Button>
        <button
          type="button"
          onClick={() => {
            writeSession(renewalDismissKey(id));
            setHidden(true);
          }}
          aria-label="Dismiss reminder"
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-warning/10 cursor-pointer"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
