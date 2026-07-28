/**
 * Whtzup subscription plans (client spec). Every tier is 50% off MRP — the
 * offer price is what we actually charge; MRP is shown struck through.
 *
 * Hotels do NOT use these plans: their charge comes from star classification
 * + priced amenities (see ./hotel-pricing).
 *
 * Keep in sync with the mirror in apps/api/src/modules/subscriptions/subscriptions.service.ts.
 */

export const PLAN_DURATION_DAYS = 90;
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
    code: 'WHTZUP_PLUS',
    name: 'Whtzup+',
    mrp: 5000,
    offerPrice: 2500,
    offers: 1,
    vouchers: 1,
    features: [
      'Web App Listing',
      'Website Listing (information only)',
      'No backlinks',
    ],
  },
  {
    code: 'WHTZUP_X',
    name: 'WhtzupX',
    mrp: 10000,
    offerPrice: 5000,
    offers: 5,
    vouchers: 5,
    features: [
      'Web App Listing',
      'Website Listing with backlinks',
      'Information only',
    ],
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
      'WhatsApp Channel Campaign — 1 weekly poster/video',
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
      'WhatsApp Channel Campaign — 1 weekly poster/video',
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

/**
 * Human label for a stored `Subscription.packageName`. Handles the current
 * plans, hotel classifications (HOTEL_4STAR) and the retired package codes
 * that older rows still carry.
 */
export function planLabel(packageName?: string | null) {
  if (!packageName) return '—';
  const p = SUBSCRIPTION_PLANS.find((x) => x.code === packageName);
  if (p) return p.name;
  if (packageName.startsWith('HOTEL_')) {
    return `Hotel ${packageName.replace('HOTEL_', '').replace('STAR', '')}★`;
  }
  // Retired codes (LISTING_BASIC, FEATURED, …) — show them readably.
  return packageName
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
