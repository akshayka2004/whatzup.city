/**
 * Home Chef subcategory pricing — three fixed annual tiers, exclusive to
 * `subcategorySlug === 'home_chefs'`. Replaces the standard 5-plan picker
 * the same way Hotel classification does. Mirrors the server-side copy in
 * apps/api/src/modules/subscriptions/subscriptions.service.ts — keep both
 * in sync.
 */

export type HomeChefTier = 'STARTER' | 'GROWTH' | 'PREMIUM';

/** Home Chef, like Hotel, bills annually rather than quarterly. */
export const HOME_CHEF_DURATION_DAYS = 365;

export type HomeChefPlan = {
  code: HomeChefTier;
  name: string;
  price: number;
  offers: number;
  vouchers: number;
  features: string[];
};

export const HOME_CHEF_PLANS: HomeChefPlan[] = [
  {
    code: 'STARTER',
    name: 'HomeChef Starter',
    price: 2500,
    offers: 1,
    vouchers: 1,
    features: [
      'Category listing (without backlinks) in web & app',
      'Invite to the Entrepreneurs Collective WhatsApp community',
      'Free listing for your business events on the platform web app',
    ],
  },
  {
    code: 'GROWTH',
    name: 'HomeChef Growth',
    price: 5000,
    offers: 5,
    vouchers: 5,
    features: [
      'Listing with backlinks (web & platform)',
      'Invite to the Entrepreneurs Collective WhatsApp community',
      'Free listing for your business events on the platform web app',
    ],
  },
  {
    code: 'PREMIUM',
    name: 'HomeChef Premium',
    price: 7500,
    offers: 7,
    vouchers: 7,
    features: [
      'Poster campaign every 3 months on WhatsApp channel',
      'Listing with backlinks',
      'Invite to the Entrepreneurs Collective WhatsApp community',
      'Free listing for your business events on the platform web app',
    ],
  },
];

export function getHomeChefPlan(tier?: string | null): HomeChefPlan | undefined {
  if (!tier) return undefined;
  return HOME_CHEF_PLANS.find((p) => p.code === tier);
}
