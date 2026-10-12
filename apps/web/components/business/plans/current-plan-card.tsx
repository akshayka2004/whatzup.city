'use client';

import Link from 'next/link';
import { AlertTriangle, CalendarClock, Clock, Sparkles } from 'lucide-react';
import { catalogueItem, reminderDays } from '@saas/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/common/status-pill';
import { Skel, SkeletonRegion } from '@/components/common/skeletons';
import { RENEWAL_REMINDER_DAYS } from '@/lib/subscription-plans';
import { cn } from '@/lib/utils';
import type { PlanEntitlements } from '@/hooks/use-entitlements';
import { UsageMeters } from './usage-meters';
import {
  currentPlanName,
  cycleLabel,
  daysUntil,
  effectLabel,
  fmtDate,
  plural,
} from './plan-helpers';

export function CurrentPlanCardSkeleton() {
  return (
    <SkeletonRegion label="Loading your plan">
      <Card className="space-y-4 p-5">
        <Skel className="h-4 w-24" />
        <Skel className="h-8 w-56" />
        <Skel className="h-2 w-full" />
        <Skel className="h-2 w-full" />
      </Card>
    </SkeletonRegion>
  );
}

/**
 * "Your plan": name + cycle, expiry countdown with a renewal CTA, add-ons, live usage and the
 * over-limit warning. Works for Free, a purchased bundle and a grandfathered legacy plan.
 */
export function CurrentPlanCard({
  ent,
  pendingCount,
  onRenew,
  onAddCapacity,
}: {
  ent: PlanEntitlements;
  /** Payments submitted but not yet verified by our office. */
  pendingCount: number;
  onRenew: () => void;
  onAddCapacity: () => void;
}) {
  const isFree = ent.source === 'FREE';
  const isLegacy = ent.source === 'LEGACY';
  const remaining = daysUntil(ent.expiresAt);
  const threshold = isLegacy || !ent.cycle ? RENEWAL_REMINDER_DAYS : reminderDays(ent.cycle);
  const expired = !isFree && remaining !== null && remaining < 0;
  const expiringSoon = !isFree && !expired && remaining !== null && remaining <= threshold;
  const over = ent.overLimit.offers + ent.overLimit.vouchers;
  const overParts: string[] = [];
  if (ent.overLimit.offers > 0) overParts.push(plural(ent.overLimit.offers, 'offer'));
  if (ent.overLimit.vouchers > 0) overParts.push(plural(ent.overLimit.vouchers, 'voucher'));

  return (
    <Card className="ui-fade-up space-y-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">Your plan</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-extrabold tracking-tight text-foreground">
              {currentPlanName(ent)}
            </h2>
            {ent.cycle && !isFree && (
              <StatusPill tone="primary" label={cycleLabel(ent.cycle)} dot={false} />
            )}
            {isFree && <StatusPill tone="neutral" label="Free" dot={false} />}
            {isLegacy && <StatusPill tone="info" label="Grandfathered" dot={false} />}
            {!isFree && !isLegacy && !expired && <StatusPill status="ACTIVE" />}
            {expired && <StatusPill status="EXPIRED" />}
          </div>
          {isFree && (
            <p className="mt-1 text-xs text-muted-foreground">
              Your listing is free with 1 live offer. Pick a plan below to add vouchers, more offers
              and analytics.
            </p>
          )}
          {isLegacy && (
            <p className="mt-1 text-xs text-muted-foreground">
              Your current plan runs until{' '}
              <span className="font-semibold text-foreground">{fmtDate(ent.expiresAt)}</span>, then
              choose a plan below.
            </p>
          )}
        </div>

        {!isFree && (
          <div className="sm:text-right">
            <div className="text-xs text-muted-foreground">
              {expired ? 'Expired on' : isLegacy ? 'Runs until' : 'Renews / expires'}
            </div>
            <div className="text-sm font-semibold text-foreground">{fmtDate(ent.expiresAt)}</div>
            {remaining !== null && (
              <div
                className={cn(
                  'mt-0.5 inline-flex items-center gap-1 text-xs',
                  expired
                    ? 'font-semibold text-danger-soft-foreground'
                    : expiringSoon
                      ? 'font-semibold text-warning-soft-foreground'
                      : 'text-muted-foreground',
                )}
              >
                <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                {expired
                  ? 'Expired'
                  : remaining === 0
                    ? 'Expires today'
                    : `${plural(remaining, 'day')} left`}
              </div>
            )}
          </div>
        )}
      </div>

      {(expired || expiringSoon) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-warning-soft p-3 text-warning-soft-foreground">
          <p className="min-w-0 flex-1 text-xs font-medium">
            {expired
              ? 'Your plan has ended. Renew to get your offers, vouchers and analytics back.'
              : isLegacy
                ? 'Your plan ends soon. Choose a new plan to stay covered without a gap.'
                : 'Your plan ends soon. Renew now to keep everything live.'}
          </p>
          <Button type="button" size="sm" onClick={onRenew} className="min-h-11 ui-press">
            {isLegacy ? 'Choose a plan' : 'Renew now'}
          </Button>
        </div>
      )}

      <UsageMeters ent={ent} />

      {ent.addons.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold text-foreground">Add-ons</div>
          <ul className="space-y-1.5">
            {ent.addons.map((a) => {
              const item = catalogueItem(a.code);
              return (
                <li
                  key={`${a.code}-${a.expiresAt}`}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-control bg-surface-sunken px-3 py-2 text-xs"
                >
                  <span className="font-medium text-foreground">
                    {a.quantity} × {item?.name ?? a.code}
                    {item && (
                      <span className="font-normal text-muted-foreground">
                        {' '}
                        · {effectLabel(item, a.quantity)}
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground">until {fmtDate(a.expiresAt)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {over > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-start gap-3 rounded-card bg-warning-soft p-3 text-warning-soft-foreground"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">
              {overParts.join(' and ')} {over === 1 ? 'is' : 'are'} over your limit and will be
              paused.
            </p>
            <p className="mt-0.5 text-xs">
              Add capacity below to keep {over === 1 ? 'it' : 'them'} live, or pause some yourself.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={onAddCapacity} className="min-h-11 ui-press">
                <Sparkles className="h-4 w-4" /> Add capacity
              </Button>
              <Button asChild size="sm" variant="outline" className="min-h-11">
                <Link href="/dashboard/offers">Manage offers</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {pendingCount > 0 && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-card bg-info-soft p-3 text-info-soft-foreground"
        >
          <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p className="text-xs font-medium">
            {pendingCount === 1
              ? '1 payment is awaiting verification.'
              : `${pendingCount} payments are awaiting verification.`}{' '}
            Your plan updates as soon as our team approves it.
          </p>
        </div>
      )}
    </Card>
  );
}
