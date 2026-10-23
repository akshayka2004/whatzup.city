// ============================================================
// Pricing catalogue — ONE definition shared by the API (what a
// business is entitled to, what a payment must cost) and the web
// app (plan picker, cart, labels). Prices are GST-inclusive: the listed price is what the customer pays.
//
//   FREE          listing + 1 live offer, no vouchers, no analytics
//   ADDON_*       stackable units on top of Free or any bundle
//   SINGLE*       one outlet, 3 offers + 3 vouchers
//   MULTI*        per outlet of a brand, 3 offers + 3 vouchers
//   *_AN          same, with analytics
//
// "Live" means status ACTIVE and not past its end date.
// ============================================================

export type BillingCycle = 'MONTHLY' | 'YEARLY' | 'QUARTERLY';
export type PlanKind = 'BASE' | 'ADDON';

/** GST contained in every listed price (and added on top for the retired legacy plans). */
export const GST_PERCENT = 18;

export interface Entitlements {
  /** Offers that may be live at the same time. */
  offers: number;
  /** Vouchers that may be live at the same time. */
  vouchers: number;
  /** Analytics page, funnel/impressions and the weekly digest. */
  analytics: boolean;
}

export interface CatalogueItem extends Entitlements {
  code: string;
  kind: PlanKind;
  name: string;
  /** Short line shown on the card. */
  blurb: string;
  /** Per month, GST included. */
  monthly: number;
  /** Per year, GST included. null = not sold yearly. */
  yearly: number | null;
  /** SINGLE bundles are for a standalone business, MULTI per outlet of a brand. */
  outlets?: 'SINGLE' | 'MULTI';
}

export const FREE_ENTITLEMENTS: Entitlements = { offers: 1, vouchers: 0, analytics: false };
export const FREE_CODE = 'FREE';

/**
 * The one plan every business gets while payments are dormant: 3 live offers, 3 live vouchers,
 * analytics included. Nothing to buy; the numbers can be raised here later.
 */
export const INCLUDED_PLAN_CODE = 'STANDARD';
export const INCLUDED_PLAN_ENTITLEMENTS: Entitlements = { offers: 3, vouchers: 3, analytics: true };

export const CATALOGUE: CatalogueItem[] = [
  // ── Bundles (one active per business) ──────────────────────
  {
    code: 'SINGLE',
    kind: 'BASE',
    name: 'Single outlet',
    blurb: '3 offers + 3 vouchers',
    offers: 3,
    vouchers: 3,
    analytics: false,
    monthly: 349,
    yearly: 3499,
    outlets: 'SINGLE',
  },
  {
    code: 'SINGLE_AN',
    kind: 'BASE',
    name: 'Single outlet + Analytics',
    blurb: '3 offers + 3 vouchers, with analytics',
    offers: 3,
    vouchers: 3,
    analytics: true,
    monthly: 399,
    yearly: 3999,
    outlets: 'SINGLE',
  },
  {
    code: 'MULTI',
    kind: 'BASE',
    name: 'Multi outlet (per outlet)',
    blurb: '3 offers + 3 vouchers for each outlet',
    offers: 3,
    vouchers: 3,
    analytics: false,
    monthly: 319,
    yearly: 3199,
    outlets: 'MULTI',
  },
  {
    code: 'MULTI_AN',
    kind: 'BASE',
    name: 'Multi outlet + Analytics (per outlet)',
    blurb: '3 offers + 3 vouchers for each outlet, with analytics',
    offers: 3,
    vouchers: 3,
    analytics: true,
    monthly: 339,
    yearly: 3399,
    outlets: 'MULTI',
  },
  // ── Add-ons (stackable units) ──────────────────────────────
  {
    code: 'ADDON_OFFER',
    kind: 'ADDON',
    name: 'Extra offer',
    blurb: '+1 offer',
    offers: 1,
    vouchers: 0,
    analytics: false,
    monthly: 99,
    yearly: null,
  },
  {
    code: 'ADDON_OV',
    kind: 'ADDON',
    name: 'Extra offer + voucher',
    blurb: '+1 offer and +1 voucher',
    offers: 1,
    vouchers: 1,
    analytics: false,
    monthly: 149,
    yearly: 949,
  },
  {
    code: 'ADDON_OV_AN',
    kind: 'ADDON',
    name: 'Extra offer + voucher with analytics',
    blurb: '+1 offer and +1 voucher, unlocks analytics',
    offers: 1,
    vouchers: 1,
    analytics: true,
    monthly: 199,
    yearly: 999,
  },
];

export function catalogueItem(code?: string | null): CatalogueItem | undefined {
  if (!code) return undefined;
  return CATALOGUE.find((c) => c.code === code);
}

export const BUNDLES = CATALOGUE.filter((c) => c.kind === 'BASE');
export const ADDONS = CATALOGUE.filter((c) => c.kind === 'ADDON');

export function cycleDays(cycle: BillingCycle): number {
  switch (cycle) {
    case 'MONTHLY':
      return 30;
    case 'YEARLY':
      return 365;
    default:
      return 90;
  }
}

/** Days before expiry that the renewal reminder starts. */
export function reminderDays(cycle: BillingCycle): number {
  return cycle === 'MONTHLY' ? 3 : 5;
}

/** GST-inclusive price of one unit for a cycle, or null when that code isn't sold on that cycle. */
export function unitPrice(code: string, cycle: BillingCycle): number | null {
  const item = catalogueItem(code);
  if (!item) return null;
  if (cycle === 'MONTHLY') return item.monthly;
  if (cycle === 'YEARLY') return item.yearly;
  return null; // QUARTERLY is legacy-only
}

export interface Totals {
  base: number;
  tax: number;
  total: number;
}

/** GST is added on top and rounded to the rupee, same as the legacy plans. */
export function withTax(base: number): Totals {
  const b = Math.max(0, Math.round(base));
  const tax = Math.round((b * GST_PERCENT) / 100);
  return { base: b, tax, total: b + tax };
}

/**
 * Listed prices already include GST, so the payable total IS the price. The tax inside it is
 * split out for invoices the same way the payments service does (base = total / 1.18, rounded;
 * tax = the remainder), so base + tax always equals what was paid.
 */
export function inclusiveTotals(total: number): Totals {
  const t = Math.max(0, Math.round(total));
  const base = Math.round(t / (1 + GST_PERCENT / 100));
  return { base, tax: t - base, total: t };
}

export interface CartLine {
  code: string;
  quantity: number;
}

export interface PricedCart {
  cycle: BillingCycle;
  lines: (CartLine & { name: string; unit: number; amount: number })[];
  totals: Totals;
}

/**
 * Price a cart (one optional bundle + any add-on units) for one cycle. Returns an error string
 * instead of throwing so both the picker and the API can show it. The API recomputes this from the
 * submitted lines and never trusts a client amount.
 */
export function priceCart(
  lines: CartLine[],
  cycle: BillingCycle,
): { ok: true; cart: PricedCart } | { ok: false; error: string } {
  if (cycle === 'QUARTERLY') return { ok: false, error: 'That billing cycle is no longer sold.' };
  const priced: PricedCart['lines'] = [];
  let bundles = 0;
  for (const l of lines) {
    const item = catalogueItem(l.code);
    if (!item) return { ok: false, error: `Unknown plan: ${l.code}` };
    const qty = Math.floor(l.quantity);
    if (!Number.isFinite(qty) || qty < 1 || qty > 50) {
      return { ok: false, error: `Quantity for ${item.name} must be between 1 and 50.` };
    }
    if (item.kind === 'BASE') {
      bundles += 1;
      if (qty !== 1) return { ok: false, error: 'Only one bundle can be bought at a time.' };
    }
    const unit = unitPrice(l.code, cycle);
    if (unit == null) {
      return {
        ok: false,
        error: `${item.name} is not available as a ${cycle.toLowerCase()} plan.`,
      };
    }
    priced.push({ code: l.code, quantity: qty, name: item.name, unit, amount: unit * qty });
  }
  if (bundles > 1) return { ok: false, error: 'Choose one bundle.' };
  if (priced.length === 0) return { ok: false, error: 'Your cart is empty.' };
  const base = priced.reduce((s, l) => s + l.amount, 0);
  return { ok: true, cart: { cycle, lines: priced, totals: inclusiveTotals(base) } };
}

/**
 * What the retired plans were sold with. Used to grandfather existing subscriptions until their end
 * date. Their limits were never enforced before, so legacy rows are only ever used to ALLOW; the
 * auto-pause job leaves them alone. Every legacy tier keeps analytics (nobody loses a paid feature).
 */
const LEGACY: Record<string, Entitlements> = {
  WHTZUP: { offers: 1, vouchers: 1, analytics: true },
  WHTZUP_PLUS: { offers: 3, vouchers: 3, analytics: true },
  WHTZUP_X: { offers: 5, vouchers: 5, analytics: true },
  WHTZUP_XL: { offers: 10, vouchers: 10, analytics: true },
  WHTZUP_LUXE: { offers: 20, vouchers: 20, analytics: true },
  LAUNCH_SPECIAL: { offers: 1000, vouchers: 1000, analytics: true },
  HOMECHEF_STARTER: { offers: 1, vouchers: 1, analytics: true },
  HOMECHEF_GROWTH: { offers: 5, vouchers: 5, analytics: true },
  HOMECHEF_PREMIUM: { offers: 7, vouchers: 7, analytics: true },
};

/** Hotels were sold as HOTEL_<n>STAR with a yearly slab; they carried a 50-post cap. */
const LEGACY_HOTEL: Entitlements = { offers: 20, vouchers: 20, analytics: true };

export function isLegacyPackage(code?: string | null): boolean {
  if (!code) return false;
  return code in LEGACY || code.startsWith('HOTEL_');
}

export function legacyEntitlements(code?: string | null): Entitlements | undefined {
  if (!code) return undefined;
  if (code in LEGACY) return LEGACY[code];
  if (code.startsWith('HOTEL_')) return LEGACY_HOTEL;
  return undefined;
}

/** Entitlements of one purchased unit (catalogue or legacy), or undefined if it isn't a paid plan. */
export function entitlementsOf(code?: string | null): Entitlements | undefined {
  const item = catalogueItem(code);
  if (item) return { offers: item.offers, vouchers: item.vouchers, analytics: item.analytics };
  return legacyEntitlements(code);
}

export function addEntitlements(a: Entitlements, b: Entitlements, times = 1): Entitlements {
  return {
    offers: a.offers + b.offers * times,
    vouchers: a.vouchers + b.vouchers * times,
    analytics: a.analytics || b.analytics,
  };
}
