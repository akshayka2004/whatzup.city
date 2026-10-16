/**
 * Whtzup subscription plans (client spec). Every tier is 50% off MRP — the
 * offer price is what we actually charge; MRP is shown struck through.
 *
 * Hotels do NOT use these plans: their charge comes from star classification
 * + priced amenities (see ./hotel-pricing).
 *
 * Keep in sync with the mirror in apps/api/src/modules/subscriptions/subscriptions.service.ts.
 */

import { catalogueItem } from '@saas/types';

/** Standard plans are billed per quarter. */
export const PLAN_DURATION_DAYS = 90;
/**
 * Hotels are billed annually — star classification is a yearly slab charge and
 * amenity/category listings are yearly, per the client pricing sheet.
 */
export const HOTEL_DURATION_DAYS = 365;
/** Show the renewal prompt this many days before a subscription expires. */
export const RENEWAL_REMINDER_DAYS = 5;

export type SubscriptionPlan = {
  code: string;
  name: string;
  mrp: number;
  offerPrice: number;
  offers: number;
  vouchers: number;
  features: string[];
  highlight?: boolean;
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    code: 'WHTZUP',
    name: 'Whtzup',
    mrp: 2500,
    offerPrice: 1500,
    offers: 1,
    vouchers: 1,
    features: ['Web App Listing', 'Website Listing (information only)', 'No backlinks'],
  },
  {
    code: 'WHTZUP_PLUS',
    name: 'Whtzup+',
    mrp: 5000,
    offerPrice: 2500,
    offers: 3,
    vouchers: 3,
    features: ['Web App Listing', 'Website Listing (information only)', 'No backlinks'],
  },
  {
    code: 'WHTZUP_X',
    name: 'WhtzupX',
    mrp: 10000,
    offerPrice: 5000,
    offers: 5,
    vouchers: 5,
    features: ['Web App Listing', 'Website Listing with backlinks', 'Information only'],
  },
  {
    code: 'WHTZUP_XL',
    name: 'WhtzupXL',
    mrp: 15000,
    offerPrice: 7500,
    offers: 10,
    vouchers: 10,
    highlight: true,
    features: [
      'Web App Listing',
      'Website Listing with backlinks',
      '1 Sponsored Category Landing Page poster image',
      'WhatsApp Channel Campaign — 1 poster/video per month',
    ],
  },
  {
    code: 'WHTZUP_LUXE',
    name: 'WhtzupLUXE',
    mrp: 20000,
    offerPrice: 10000,
    offers: 20,
    vouchers: 20,
    features: [
      'Web App Listing',
      'Website Listing with backlinks',
      'Sponsored Category Landing Page video (up to 60s) + poster image',
      'WhatsApp Channel Campaign — 1 poster & 1 video per week',
    ],
  },
];

export function getPlan(code?: string | null): SubscriptionPlan | undefined {
  if (!code) return undefined;
  return SUBSCRIPTION_PLANS.find((p) => p.code === code);
}

/**
 * UPI QR served from apps/web/public. `payment-qr.png` is the code extracted
 * from the original Google Pay screenshot and upscaled with a clean quiet
 * zone, so it scans reliably at large sizes. QR.jpeg is kept as the source.
 */
export const PAYMENT_QR_SRC = '/payment-qr.png';
/** Shown alongside the QR so users can also pay by entering the ID manually. */
export const PAYMENT_UPI_ID = '8129255552@okbizaxis';
export const PAYMENT_PAYEE_NAME = 'Lifeart';

export function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

/** GST applied on top of every plan and hotel listing charge. */
export const TAX_PERCENT = 18;

export type Totals = { base: number; tax: number; total: number };

/**
 * Plan/hotel prices are exclusive of GST — tax is added on top, so Whtzup+ at
 * ₹2,500 is payable as ₹2,950. Mirrored server-side; the server recomputes and
 * never trusts a client-sent amount.
 */
export function withTax(base: number): Totals {
  const b = Math.max(0, Math.round(base));
  const tax = Math.round((b * TAX_PERCENT) / 100);
  return { base: b, tax, total: b + tax };
}

/**
 * Human label for a stored `Subscription.packageName`. Handles the current
 * plans, hotel classifications (HOTEL_4STAR) and the retired package codes
 * that older rows still carry.
 */
export function planLabel(packageName?: string | null, quantity?: number | null) {
  if (!packageName) return '—';
  const p = SUBSCRIPTION_PLANS.find((x) => x.code === packageName);
  if (p) return p.name;
  // Current catalogue (SINGLE, MULTI_AN, ADDON_OV…); add-ons show their unit count.
  const c = catalogueItem(packageName);
  if (c) {
    const qty = Number(quantity ?? 1);
    return c.kind === 'ADDON' && qty > 1 ? `${c.name} × ${qty}` : c.name;
  }
  if (packageName.startsWith('HOTEL_')) {
    return `Hotel ${packageName.replace('HOTEL_', '').replace('STAR', '')}★`;
  }
  if (packageName.startsWith('HOMECHEF_')) {
    const tier = packageName.replace('HOMECHEF_', '');
    return `HomeChef ${tier.charAt(0) + tier.slice(1).toLowerCase()}`;
  }
  // Retired codes (LISTING_BASIC, FEATURED, …) — show them readably.
  return packageName
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** "Monthly" / "Yearly" for a stored `billingCycle`; QUARTERLY only exists on legacy rows. */
export function billingCycleLabel(cycle?: string | null) {
  if (cycle === 'MONTHLY') return 'Monthly';
  if (cycle === 'YEARLY') return 'Yearly';
  if (cycle === 'QUARTERLY') return 'Quarterly (legacy)';
  return '—';
}

/** Months one payment of this cycle covers. Legacy rows fall back to their stored duration. */
export function cycleMonths(cycle?: string | null, durationDays?: number | null) {
  if (cycle === 'YEARLY') return 12;
  if (cycle === 'MONTHLY') return 1;
  if (cycle === 'QUARTERLY' && !durationDays) return 3;
  return Math.max(1, Math.round(Number(durationDays || 90) / 30));
}

/**
 * Monthly recurring revenue (ex-GST) of one subscription row: yearly ÷ 12, monthly as is, legacy
 * quarterly ÷ 3. pricing already holds the line total (unit × quantity). Current catalogue plans
 * are sold GST-inclusive, so their GST is taken out; retired legacy plans were sold ex-GST.
 */
export function monthlyRecurring(row: {
  pricing?: string | number | null;
  billingCycle?: string | null;
  duration?: number | null;
  packageName?: string | null;
}) {
  const line = Number(row.pricing || 0);
  const exTax = catalogueItem(row.packageName ?? '') ? line / (1 + TAX_PERCENT / 100) : line;
  return exTax / cycleMonths(row.billingCycle, row.duration);
}

export type CartLineView = {
  code: string;
  name: string;
  quantity: number;
  unit: number;
  amount: number;
};

/**
 * Itemised lines of a cart payment from its `invoiceMetadata`, or null for legacy single-plan
 * payments (so callers keep their old layout).
 */
export function cartLinesOf(meta?: any): CartLineView[] | null {
  const lines = meta?.cart?.lines;
  if (!Array.isArray(lines) || !lines.length) return null;
  return lines.map((l: any) => {
    const quantity = Math.max(1, Number(l.quantity || 1));
    return {
      code: String(l.code),
      name: planLabel(String(l.code)),
      quantity,
      unit: Number(l.unit || 0),
      amount: Number(l.amount || 0),
    };
  });
}
