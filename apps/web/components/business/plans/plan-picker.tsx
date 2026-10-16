'use client';

import { Check, Gift } from 'lucide-react';
import { ADDONS, BUNDLES, catalogueItem, unitPrice, GST_PERCENT } from '@saas/types';
import type { CatalogueItem } from '@saas/types';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { StatusPill } from '@/components/common/status-pill';
import { formatINR } from '@/lib/subscription-plans';
import { cn } from '@/lib/utils';
import type { PlanEntitlements } from '@/hooks/use-entitlements';
import { AddonStepper } from './addon-stepper';
import {
  cycleSuffix,
  monthsFree,
  plural,
  yearlySaving,
  type BundleFamily,
  type PurchasableCycle,
} from './plan-helpers';

const CYCLES: PurchasableCycle[] = ['MONTHLY', 'YEARLY'];

export function PlanPicker({
  ent,
  family,
  outletName,
  cycle,
  onCycle,
  analytics,
  onAnalytics,
  bundleOn,
  onBundleOn,
  addons,
  onAddon,
}: {
  ent: PlanEntitlements | null;
  family: BundleFamily;
  outletName?: string;
  cycle: PurchasableCycle;
  onCycle: (c: PurchasableCycle) => void;
  analytics: boolean;
  onAnalytics: (v: boolean) => void;
  bundleOn: boolean;
  onBundleOn: (v: boolean) => void;
  addons: Record<string, number>;
  onAddon: (code: string, qty: number) => void;
}) {
  const familyBundles = BUNDLES.filter((b) => b.outlets === family);
  const bundleCode = family + (analytics ? '_AN' : '');
  const bundle = catalogueItem(bundleCode) as CatalogueItem;
  const bundlePrice = unitPrice(bundleCode, cycle);
  const isCurrentBundle = ent?.plan === bundleCode;
  const onFree = !ent || ent.plan === 'FREE';

  // The headline saving is computed from the catalogue, never hardcoded.
  const freeMonths = Math.max(0, ...familyBundles.map(monthsFree));

  const sellable = ADDONS.map((a) => ({ item: a, unit: unitPrice(a.code, cycle) })).filter(
    (a): a is { item: CatalogueItem; unit: number } => a.unit != null,
  );
  const hiddenOnCycle = ADDONS.filter((a) => unitPrice(a.code, cycle) == null);

  return (
    <div id="plan-picker" className="scroll-mt-20 space-y-6">
      {/* Billing cycle + analytics */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="radiogroup"
            aria-label="Billing cycle"
            className="inline-flex rounded-control bg-surface-sunken p-1"
          >
            {CYCLES.map((c) => {
              const selected = c === cycle;
              return (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onCycle(c)}
                  className={cn(
                    'ui-press inline-flex min-h-11 items-center gap-2 rounded-control px-4 text-sm font-semibold transition-colors',
                    selected
                      ? 'bg-card text-foreground shadow-e1'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {c === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                  {c === 'YEARLY' && freeMonths > 0 && (
                    <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success-soft-foreground">
                      {plural(freeMonths, 'month')} free
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-border bg-card px-3.5">
            <Switch
              checked={analytics}
              onCheckedChange={onAnalytics}
              aria-label="Include analytics"
            />
            <span className="text-sm font-medium text-foreground">With analytics</span>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">All prices include {GST_PERCENT}% GST.</p>
      </div>

      {/* Bundles */}
      <div className="ui-stagger grid gap-3 sm:grid-cols-2">
        {/* Free */}
        <Card className={cn('flex flex-col p-5', onFree && 'border-primary bg-brand-soft/40')}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-foreground">Free</span>
            {onFree && <StatusPill tone="primary" label="Current plan" dot={false} />}
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-foreground">{formatINR(0)}</span>
            <span className="text-xs text-muted-foreground">forever</span>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            <Perk>Your listing, always on</Perk>
            <Perk>1 live offer</Perk>
          </ul>
          <p className="mt-auto pt-4 text-xs text-muted-foreground">
            {onFree
              ? 'Add a bundle or add-ons any time.'
              : 'You drop back to this when a paid plan ends.'}
          </p>
        </Card>

        {/* Single / Multi bundle (variant follows the analytics switch) */}
        <Card
          className={cn(
            'flex flex-col p-5 transition-colors',
            (bundleOn || isCurrentBundle) && 'border-primary bg-brand-soft/40',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-foreground">{bundle.name}</span>
            {isCurrentBundle ? (
              <StatusPill tone="primary" label="Current plan" dot={false} />
            ) : bundleOn ? (
              <StatusPill tone="success" label="In cart" dot={false} />
            ) : null}
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            {bundlePrice != null ? (
              <>
                <span className="text-2xl font-extrabold text-foreground">
                  {formatINR(bundlePrice)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {cycleSuffix(cycle)}
                  {family === 'MULTI' ? ' per outlet' : ''}
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Not sold on this cycle</span>
            )}
          </div>
          {cycle === 'YEARLY' && yearlySaving(bundle) > 0 && (
            <p className="mt-0.5 text-xs font-semibold text-success-soft-foreground">
              Save {formatINR(yearlySaving(bundle))} vs monthly
            </p>
          )}
          <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            <Perk>{plural(bundle.offers, 'live offer')}</Perk>
            <Perk>{plural(bundle.vouchers, 'live voucher')}</Perk>
            <Perk muted={!bundle.analytics}>
              {bundle.analytics ? 'Analytics and weekly digest' : 'No analytics'}
            </Perk>
          </ul>
          {family === 'MULTI' && (
            <p className="mt-3 text-xs text-muted-foreground">
              Billed per outlet. This purchase covers {outletName || 'this outlet'} only.
            </p>
          )}
          <div className="mt-auto pt-4">
            <button
              type="button"
              onClick={() => onBundleOn(!bundleOn)}
              aria-pressed={bundleOn}
              disabled={bundlePrice == null}
              className={cn(
                'ui-press inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control px-4 text-sm font-semibold transition-colors disabled:opacity-50',
                bundleOn
                  ? 'border border-border-strong/70 bg-card text-foreground hover:bg-secondary'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90',
              )}
            >
              {bundleOn ? (
                <>
                  <Check className="h-4 w-4" /> Selected. Tap to remove
                </>
              ) : isCurrentBundle ? (
                'Renew this plan'
              ) : (
                `Choose ${bundle.name}`
              )}
            </button>
          </div>
        </Card>
      </div>

      {/* Add-ons */}
      <div id="plan-addons" className="scroll-mt-20 space-y-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Gift className="h-4 w-4 text-primary" aria-hidden /> Add-ons
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Need more room? Add units on top of Free or any bundle. They run for one{' '}
            {cycle === 'YEARLY' ? 'year' : 'month'}.
          </p>
        </div>
        <div className="ui-stagger space-y-2.5">
          {sellable.map(({ item, unit }) => (
            <AddonStepper
              key={item.code}
              item={item}
              unit={unit}
              cycle={cycle}
              quantity={addons[item.code] ?? 0}
              onChange={(n) => onAddon(item.code, n)}
            />
          ))}
        </div>
        {hiddenOnCycle.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {hiddenOnCycle.map((a) => a.name).join(', ')}{' '}
            {hiddenOnCycle.length === 1 ? 'is' : 'are'} only sold monthly. Switch to Monthly to add{' '}
            {hiddenOnCycle.length === 1 ? 'it' : 'them'}.
          </p>
        )}
      </div>
    </div>
  );
}

function Perk({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <li className="flex items-start gap-1.5">
      <Check
        className={cn(
          'mt-0.5 h-3.5 w-3.5 shrink-0',
          muted ? 'text-muted-foreground/60' : 'text-success-soft-foreground',
        )}
        aria-hidden
      />
      <span className={cn(muted && 'text-muted-foreground/80')}>{children}</span>
    </li>
  );
}
