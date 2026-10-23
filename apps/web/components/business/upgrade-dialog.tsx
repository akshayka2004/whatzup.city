'use client';

import Link from 'next/link';
import { Lock, Sparkles } from 'lucide-react';
import { PAYMENTS_ENABLED } from '@/lib/feature-flags';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** The part of an ApiResponse that says "your plan doesn't allow this". */
export interface PlanErrorInfo {
  code?: string;
  error?: string | null;
  details?: Record<string, any>;
}

/** True when an API call failed because of the plan (limit reached or feature locked). */
export function isPlanError(res: PlanErrorInfo | null | undefined): boolean {
  return res?.code === 'PLAN_LIMIT' || res?.code === 'PLAN_FEATURE';
}

/**
 * Opens when an offer/voucher/analytics call is refused by the plan. One consistent message with
 * the real numbers and a way forward, instead of a raw error string.
 */
export function UpgradeDialog({
  open,
  onOpenChange,
  info,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  info: PlanErrorInfo | null;
}) {
  const d = info?.details ?? {};
  const isLimit = info?.code === 'PLAN_LIMIT';
  const noun = d.resource === 'voucher' ? 'voucher' : 'offer';
  const title = isLimit
    ? d.limit === 0
      ? `Vouchers are not in your plan`
      : `You've reached your ${noun} limit`
    : 'Analytics is not in your plan';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-soft-foreground">
            {isLimit ? <Sparkles className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{info?.error}</DialogDescription>
        </DialogHeader>
        {isLimit && typeof d.limit === 'number' && d.limit > 0 && (
          <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground tabular-nums">
            Live {noun}s: <strong className="text-foreground">{d.used}</strong> of{' '}
            <strong className="text-foreground">{d.limit}</strong>
          </p>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="ui-press inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            {PAYMENTS_ENABLED ? 'Not now' : 'Got it'}
          </button>
          {PAYMENTS_ENABLED && (
            <Link
              href={d.upgradeUrl || '/dashboard/subscriptions'}
              onClick={() => onOpenChange(false)}
              className="ui-press inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              See plans & add-ons
            </Link>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
