'use client';

import { ArrowRight, QrCode, ShoppingBag } from 'lucide-react';
import { cycleDays, GST_PERCENT, type PricedCart } from '@saas/types';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/subscription-plans';
import { cn } from '@/lib/utils';
import type { Preview } from './plan-helpers';

/** Totals + lines for the cart. Used inline on desktop and inside the bottom sheet on mobile. */
export function CartSummary({
  cart,
  error,
  preview,
  onPay,
  onClear,
  showHeading = true,
  className,
}: {
  cart: PricedCart | null;
  error?: string | null;
  preview?: { before: Preview; after: Preview } | null;
  onPay: () => void;
  onClear: () => void;
  /** Hide the "Your order" heading when a sheet already shows one. */
  showHeading?: boolean;
  className?: string;
}) {
  if (!cart) {
    return (
      <div className={cn('space-y-3', className)}>
        {showHeading && (
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <ShoppingBag className="h-4 w-4 text-primary" aria-hidden /> Your order
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {error || 'Choose a bundle or add-ons to see your total.'}
        </p>
      </div>
    );
  }

  const { lines, totals, cycle } = cart;
  const per = cycle === 'YEARLY' ? 'year' : 'month';

  return (
    <div className={cn('space-y-4', className)}>
      <div
        className={cn('flex items-center gap-2', showHeading ? 'justify-between' : 'justify-end')}
      >
        {showHeading && (
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <ShoppingBag className="h-4 w-4 text-primary" aria-hidden /> Your order
          </div>
        )}
        <button
          type="button"
          onClick={onClear}
          className="ui-press min-h-11 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      </div>

      <ul className="space-y-2.5">
        {lines.map((l) => (
          <li key={l.code} className="flex items-start justify-between gap-3 text-sm">
            <div className="min-w-0">
              <div className="font-medium text-foreground">{l.name}</div>
              <div className="text-xs text-muted-foreground">
                {l.quantity} × {formatINR(l.unit)} per {per}
              </div>
            </div>
            <span className="shrink-0 font-semibold tabular-nums text-foreground">
              {formatINR(l.amount)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="space-y-1.5 border-t border-border pt-3 text-sm">
        <div className="flex items-baseline justify-between pt-1">
          <dt className="font-bold text-foreground">Total</dt>
          <dd className="text-2xl font-extrabold tabular-nums text-foreground">
            {formatINR(totals.total)}
          </dd>
        </div>
        <p className="text-xs text-muted-foreground">
          Includes {formatINR(totals.tax)} GST ({GST_PERCENT}%).
        </p>
      </dl>

      {preview && (
        <div className="rounded-control bg-surface-sunken p-3 text-xs text-muted-foreground">
          <div className="mb-1 font-semibold text-foreground">After verification</div>
          <div className="flex justify-between">
            <span>Live offers</span>
            <span className="tabular-nums font-medium text-foreground">
              {preview.before.offers} → {preview.after.offers}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Live vouchers</span>
            <span className="tabular-nums font-medium text-foreground">
              {preview.before.vouchers} → {preview.after.vouchers}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Analytics</span>
            <span className="font-medium text-foreground">
              {preview.before.analytics ? 'On' : 'Off'} → {preview.after.analytics ? 'On' : 'Off'}
            </span>
          </div>
        </div>
      )}

      <Button type="button" size="lg" onClick={onPay} className="ui-press min-h-12 w-full">
        <QrCode className="h-4 w-4" /> Pay with UPI / QR <ArrowRight className="h-4 w-4" />
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Valid for {cycleDays(cycle)} days from activation. Activates once our team verifies your
        payment.
      </p>
    </div>
  );
}
