'use client';

import React from 'react';
import { Minus, Plus, Sparkles, CheckCircle, BarChart3 } from 'lucide-react';
import { GST_PERCENT, catalogueItem, cycleDays, unitPrice } from '@saas/types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { formatINR } from '@/lib/subscription-plans';
import { cn } from '@/lib/utils';
import type { Wizard } from './use-register-wizard';

const CYCLES: { value: 'MONTHLY' | 'YEARLY'; label: string; suffix: string }[] = [
  { value: 'MONTHLY', label: 'Monthly', suffix: '/mo' },
  { value: 'YEARLY', label: 'Yearly', suffix: '/yr' },
];

/** Priced lines, GST and the amount payable: shared by the upgrade picker and the payment screen. */
export function OrderSummary({ w, className }: { w: Wizard; className?: string }) {
  const { claimLaunch, launchOffer, launchTotals, pricedCart, payableTotals, billingCycle } = w;
  const days = claimLaunch
    ? (launchOffer.status?.durationDays ?? 180)
    : cycleDays(billingCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY');

  return (
    <div className={cn('rounded-2xl border border-border p-5 space-y-3', className)}>
      <h3 className="text-sm font-bold text-foreground">Your total</h3>
      {claimLaunch ? (
        <div className="flex justify-between gap-3 text-sm text-muted-foreground">
          <span>Launch offer</span>
          <span className="tabular-nums">{formatINR(launchTotals.base)}</span>
        </div>
      ) : pricedCart.ok ? (
        <ul className="space-y-1.5 text-sm">
          {pricedCart.cart.lines.map((l) => (
            <li key={l.code} className="flex justify-between gap-3 text-muted-foreground">
              <span className="min-w-0">
                {l.name}
                {l.quantity > 1 ? ` × ${l.quantity}` : ''}
              </span>
              <span className="tabular-nums shrink-0">{formatINR(l.amount)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{pricedCart.error}</p>
      )}
      {payableTotals && (
        <>
          <div className="space-y-1.5 border-t border-border pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatINR(payableTotals.base)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>GST ({GST_PERCENT}%)</span>
              <span className="tabular-nums">{formatINR(payableTotals.tax)}</span>
            </div>
          </div>
          <div className="flex justify-between items-baseline border-t border-border pt-3">
            <span className="text-sm font-bold text-foreground">Amount payable</span>
            <span className="text-2xl font-extrabold text-foreground tabular-nums">
              {formatINR(payableTotals.total)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {claimLaunch
              ? `You pay for the paid months and get the bonus months free: valid ${days} days from activation.`
              : `Valid for ${days} days from activation.`}{' '}
            Inclusive of {GST_PERCENT}% GST.
          </p>
        </>
      )}
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
  max = 10,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  max?: number;
}) {
  return (
    <div className="inline-flex items-center gap-1 shrink-0">
      <button
        type="button"
        aria-label={`Remove one ${label}`}
        onClick={() => onChange(value - 1)}
        disabled={value <= 0}
        className="ui-press inline-flex h-11 w-11 items-center justify-center rounded-xl border border-input text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-8 text-center text-sm font-bold text-foreground tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Add one ${label}`}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        className="ui-press inline-flex h-11 w-11 items-center justify-center rounded-xl border border-input text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * "Upgrade now (optional)": billing cycle, analytics, the bundle for this account type and compact
 * add-on steppers, ending in a priced cart. Nothing here is required to register.
 */
export function UpgradePanel({ w }: { w: Wizard }) {
  const {
    isHotel,
    canClaimLaunch,
    claimLaunch,
    setClaimLaunch,
    launchOffer,
    launchSlotsLeft,
    categoryLabel,
    launchTotals,
    isBrandOutlet,
    billingCycle,
    setBillingCycle,
    wantAnalytics,
    setWantAnalytics,
    includeBundle,
    setIncludeBundle,
    addonQty,
    setAddonUnits,
    bundleCode,
    visibleAddons,
    cartLines,
    payableTotals,
    hotelProfileReady,
    loading,
    setShowPayment,
  } = w;

  const cycle: 'MONTHLY' | 'YEARLY' = billingCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
  const suffix = cycle === 'YEARLY' ? '/yr' : '/mo';
  const bundle = catalogueItem(bundleCode);
  const bundlePrice = unitPrice(bundleCode, cycle);
  const yearlySavePct =
    bundle && bundle.yearly != null
      ? Math.round((1 - bundle.yearly / (bundle.monthly * 12)) * 100)
      : 0;

  return (
    <section className="space-y-5 rounded-2xl border border-border p-4 sm:p-5">
      <div>
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-soft-foreground" />
          Upgrade now (optional)
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {isBrandOutlet
            ? 'Priced per outlet. 3 offers and 3 vouchers live at once.'
            : 'Run up to 3 offers and 3 vouchers at once.'}{' '}
          You can also upgrade any time from your dashboard.
        </p>
      </div>

      {canClaimLaunch && (
        <div className="rounded-xl border border-success/25 bg-success-soft p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">Claim launch offer</p>
              <p className="text-xs text-muted-foreground mt-1">
                ₹{(launchOffer.status?.price ?? 2500).toLocaleString('en-IN')} for the first{' '}
                {launchOffer.status?.paidDays ?? 90} days, plus{' '}
                {launchOffer.status?.bonusDays ?? 90} days free and unlimited offers.{' '}
                <span className="font-semibold text-success-soft-foreground">
                  {launchSlotsLeft} of {launchOffer.status?.slotsPerCategory} slots left in{' '}
                  {categoryLabel}
                </span>
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setClaimLaunch((v) => !v)}
              variant={claimLaunch ? 'default' : 'outline'}
              className="rounded-xl h-11 px-5 font-semibold cursor-pointer shrink-0 w-full sm:w-auto"
            >
              {claimLaunch ? 'Launch offer selected' : 'Claim launch offer'}
            </Button>
          </div>
        </div>
      )}

      {claimLaunch ? (
        <div className="rounded-xl border border-border p-4 space-y-2">
          <p className="text-sm font-bold text-foreground">
            Launch Offer · {launchOffer.status?.durationDays} days · {formatINR(launchTotals.base)}
          </p>
          <ul className="space-y-1">
            {[
              'Web App Listing',
              'Website Listing with backlinks',
              'Unlimited offers · unlimited vouchers',
              'Paid months plus bonus months free',
            ].map((f) => (
              <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <CheckCircle className="h-3.5 w-3.5 text-success-soft-foreground shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Pay via the QR code on the next screen. The offer is reserved once you submit.
          </p>
        </div>
      ) : (
        <>
          {/* Billing cycle */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Billing</p>
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-input p-1" role="group">
              {CYCLES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={cycle === c.value}
                  onClick={() => setBillingCycle(c.value)}
                  className={cn(
                    'ui-press min-h-11 rounded-lg px-3 text-sm font-semibold cursor-pointer transition-colors',
                    cycle === c.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {c.label}
                  {c.value === 'YEARLY' && yearlySavePct > 0 ? ` · save ${yearlySavePct}%` : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Analytics */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <div className="flex items-start gap-3 min-w-0">
              <BarChart3 className="h-5 w-5 text-brand-soft-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Include analytics</p>
                <p className="text-xs text-muted-foreground">
                  Views, claims and walk-ins, plus the weekly digest.
                </p>
              </div>
            </div>
            <Switch
              checked={wantAnalytics}
              onCheckedChange={setWantAnalytics}
              aria-label="Include analytics"
            />
          </div>

          {/* Bundle for this account type */}
          {bundle && (
            <button
              type="button"
              aria-pressed={includeBundle}
              onClick={() => setIncludeBundle(!includeBundle)}
              className={cn(
                'ui-press w-full text-left rounded-xl border p-4 cursor-pointer transition-colors',
                includeBundle ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/40',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">{bundle.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{bundle.blurb}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-extrabold text-foreground tabular-nums">
                    {bundlePrice != null ? formatINR(bundlePrice) : '—'}
                    <span className="text-xs font-medium text-muted-foreground">{suffix}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">+ GST</p>
                </div>
              </div>
              <p className="mt-2 text-xs font-semibold text-brand-soft-foreground">
                {includeBundle ? 'Included in your order' : 'Tap to include'}
              </p>
            </button>
          )}

          {/* Add-ons */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Add-ons (stack as many as you need)
            </p>
            <ul className="space-y-2">
              {visibleAddons.map((a) => {
                const price = unitPrice(a.code, cycle);
                const unavailable = price == null;
                return (
                  <li
                    key={a.code}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{a.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {unavailable
                          ? 'Sold monthly only'
                          : `${formatINR(price)}${suffix} + GST · ${a.blurb}`}
                      </p>
                    </div>
                    <Stepper
                      label={a.name}
                      value={unavailable ? 0 : addonQty[a.code] || 0}
                      onChange={(n) => setAddonUnits(a.code, n)}
                      max={unavailable ? 0 : 10}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      {payableTotals && (
        <div className="text-xs text-muted-foreground">
          {claimLaunch
            ? `Total with GST: ${formatINR(payableTotals.total)}`
            : `${cartLines.length} item${cartLines.length === 1 ? '' : 's'} · total with GST ${formatINR(payableTotals.total)}`}
        </div>
      )}

      <Button
        type="button"
        onClick={() => setShowPayment(true)}
        disabled={loading || !payableTotals || !hotelProfileReady}
        className="rounded-xl h-11 px-6 font-semibold cursor-pointer w-full"
      >
        Continue to payment
      </Button>
      {!payableTotals && !claimLaunch && (
        <p className="text-xs text-muted-foreground">
          Choose the bundle or at least one add-on to upgrade, or continue with Free above.
        </p>
      )}
      {!hotelProfileReady && isHotel && (
        <p className="text-xs text-muted-foreground">
          Choose your hotel star classification above first.
        </p>
      )}
    </section>
  );
}
