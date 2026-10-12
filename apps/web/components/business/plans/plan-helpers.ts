import {
  catalogueItem,
  entitlementsOf,
  unitPrice,
  type BillingCycle,
  type CartLine,
  type CatalogueItem,
} from '@saas/types';
import { planLabel } from '@/lib/subscription-plans';
import type { PlanEntitlements } from '@/hooks/use-entitlements';

export type PurchasableCycle = 'MONTHLY' | 'YEARLY';
export type BundleFamily = 'SINGLE' | 'MULTI';

export function fmtDate(v?: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function daysUntil(iso?: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export function cycleLabel(cycle?: BillingCycle | null) {
  if (cycle === 'YEARLY') return 'Yearly';
  if (cycle === 'MONTHLY') return 'Monthly';
  if (cycle === 'QUARTERLY') return 'Quarterly';
  return '';
}

export function cycleSuffix(cycle: PurchasableCycle) {
  return cycle === 'YEARLY' ? '/yr' : '/mo';
}

/** Readable name for whatever the business is on right now. */
export function currentPlanName(ent: PlanEntitlements | null) {
  if (!ent || ent.plan === 'FREE') return 'Free';
  return catalogueItem(ent.plan)?.name ?? planLabel(ent.plan);
}

export function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** "+2 offers, +2 vouchers, analytics" for a number of add-on units. */
export function effectLabel(
  item: Pick<CatalogueItem, 'offers' | 'vouchers' | 'analytics'>,
  qty = 1,
) {
  const parts: string[] = [];
  if (item.offers) parts.push(`+${plural(item.offers * qty, 'offer')}`);
  if (item.vouchers) parts.push(`+${plural(item.vouchers * qty, 'voucher')}`);
  if (item.analytics) parts.push('unlocks analytics');
  return parts.join(', ');
}

/** Whole months of saving for paying yearly instead of monthly, based on the catalogue. */
export function monthsFree(item: CatalogueItem): number {
  if (item.yearly == null || item.monthly <= 0) return 0;
  return Math.max(0, Math.round((item.monthly * 12 - item.yearly) / item.monthly));
}

export function yearlySaving(item: CatalogueItem): number {
  if (item.yearly == null) return 0;
  return Math.max(0, item.monthly * 12 - item.yearly);
}

export interface Preview {
  offers: number;
  vouchers: number;
  analytics: boolean;
}

/**
 * What the business will be entitled to once the cart is verified. Returns null when we can't say
 * for sure (a grandfathered legacy plan combined with a new bundle), so the UI shows only the
 * "+N" effects instead of a possibly wrong total.
 */
export function previewEntitlements(
  ent: PlanEntitlements | null,
  lines: CartLine[],
): { before: Preview; after: Preview } | null {
  if (!ent || lines.length === 0) return null;
  let addonOffers = 0;
  let addonVouchers = 0;
  let addonAnalytics = false;
  for (const a of ent.addons) {
    const e = entitlementsOf(a.code);
    if (!e) continue;
    addonOffers += e.offers * a.quantity;
    addonVouchers += e.vouchers * a.quantity;
    addonAnalytics = addonAnalytics || e.analytics;
  }
  const baseOffers = Math.max(0, ent.offers - addonOffers);
  const baseVouchers = Math.max(0, ent.vouchers - addonVouchers);

  let bundle: CatalogueItem | undefined;
  let newOffers = 0;
  let newVouchers = 0;
  let newAnalytics = false;
  for (const l of lines) {
    const item = catalogueItem(l.code);
    if (!item) continue;
    if (item.kind === 'BASE') {
      bundle = item;
    } else {
      newOffers += item.offers * l.quantity;
      newVouchers += item.vouchers * l.quantity;
      newAnalytics = newAnalytics || item.analytics;
    }
  }
  if (bundle && ent.source === 'LEGACY') return null;

  const after: Preview = bundle
    ? {
        offers: bundle.offers + addonOffers + newOffers,
        vouchers: bundle.vouchers + addonVouchers + newVouchers,
        analytics: bundle.analytics || addonAnalytics || newAnalytics,
      }
    : {
        offers: baseOffers + addonOffers + newOffers,
        vouchers: baseVouchers + addonVouchers + newVouchers,
        analytics: ent.analytics || newAnalytics,
      };
  return {
    before: { offers: ent.offers, vouchers: ent.vouchers, analytics: ent.analytics },
    after,
  };
}

/** Price shown on a card / stepper: "₹349" for the cycle, or null when that cycle isn't sold. */
export function priceFor(code: string, cycle: PurchasableCycle) {
  return unitPrice(code, cycle);
}
