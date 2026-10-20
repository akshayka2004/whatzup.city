import { channelsOf } from '@/lib/offer-channels';
import { categoryLabel, rateLines, type PlatformOfferDetails } from '@/lib/platform-offers';

export interface Offer {
  id: string;
  title: string;
  description: string;
  business: string;
  businessType: string;
  discount: number;
  discountAmount?: number;
  discountLabel: string;
  expiresAt?: string;
  expiresIn?: number;
  terms?: string;
  /** Platform-curated offers aren't tied to a business and can't be claimed. */
  isPlatform?: boolean;
  imageUrl?: string | null;
  /**
   * Platform image URLs are signed for ~60s, so server-rendered data never carries
   * them. This flags "an image exists, a fresh URL is on its way" so the card can
   * reserve the space (no layout shift) until the client refresh lands.
   */
  imagePending?: boolean;
  phone?: string | null;
  details?: PlatformOfferDetails;
  subType?: string | null;
  /** Raw category enum value, used to pick the right rate-line rules. */
  category?: string;
  /** Where the offer applies (any of INSTORE / TAKEAWAY / ONLINE). All three shows no chip. */
  channels?: string[];
  /** Business city, when the payload carries it. */
  city?: string | null;
  /** Business opening hours, when the payload carries them (powers the "Open now" pill). */
  operatingHours?: unknown;
}

export const CLAIMED_STORAGE_KEY = 'claimed_offers';

export function getClaimedOffers(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(CLAIMED_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function mapApiOffer(o: any): Offer {
  const days = daysUntil(o.expiresAt || o.endDate);
  return {
    id: o.id,
    title: o.title || o.name || 'Offer',
    description: o.description || (o.discountPercent ? `${o.discountPercent}% off` : ''),
    business: o.business?.name || o.businessName || '',
    businessType: o.business?.category?.name || o.category || '',
    discount: o.discountPercent ?? o.discount ?? 0,
    discountAmount: o.discountAmount != null ? Number(o.discountAmount) : 0,
    discountLabel:
      o.discountAmount != null && Number(o.discountAmount) > 0 && !(o.discountPercent > 0)
        ? `₹${Number(o.discountAmount).toLocaleString('en-IN')}`
        : `${o.discountPercent ?? o.discount ?? 0}%`,
    expiresAt: o.expiresAt || o.endDate,
    expiresIn: days ?? undefined,
    terms: o.terms || o.conditions || '',
    channels: channelsOf(o),
    city: o.business?.city ?? o.city ?? null,
    operatingHours: o.business?.operatingHours ?? o.operatingHours ?? undefined,
  };
}

/**
 * Platform-curated offers into the same card shape. They have no discount and
 * no expiry, so the badge carries the price instead and no countdown renders.
 */
export function mapPlatformOffer(o: any, fromServer = false): Offer {
  const rates = rateLines(o.category, o.subType, o.details);
  return {
    id: o.id,
    title: o.title,
    description: o.description || '',
    business: o.location || '',
    businessType: categoryLabel(o.category),
    discount: 0,
    discountAmount: 0,
    // Empty (not "View") when the admin hasn't entered a price or any rate —
    // the rate badge/box is hidden entirely rather than showing a placeholder.
    discountLabel: o.price || rates[0]?.rate || '',
    expiresIn: o.endsAt
      ? Math.max(0, Math.ceil((new Date(o.endsAt).getTime() - Date.now()) / 86_400_000))
      : undefined,
    terms: '',
    isPlatform: true,
    imageUrl: fromServer ? null : o.imageSignedUrl || null,
    imagePending: fromServer && !!o.imageSignedUrl,
    phone: o.phone || null,
    details: o.details || {},
    subType: o.subType || null,
    category: o.category,
    channels: platformChannels(o.category, o.subType),
  };
}

/**
 * Channels of a platform offer from its sub category (dine in / offline = instore) or, for the
 * Dine-in / Takeaway categories, the category itself. Anything else is not channel-specific.
 */
function platformChannels(category?: string, subType?: string | null): string[] | undefined {
  const mode = subType || (category === 'DINE_IN' || category === 'TAKEAWAY' ? category : '');
  if (mode === 'DINE_IN' || mode === 'OFFLINE') return ['INSTORE'];
  if (mode === 'TAKEAWAY') return ['TAKEAWAY'];
  if (mode === 'ONLINE') return ['ONLINE'];
  return undefined;
}

/** The API wraps lists inconsistently ({data}, {items}, bare array) — same tolerance the page always had. */
export function listFrom(raw: any, keys: string[]): any[] {
  if (Array.isArray(raw)) return raw;
  for (const k of keys) {
    const v = raw?.[k];
    if (Array.isArray(v)) return v;
  }
  return [];
}

/**
 * Business offers + platform offers into one list (platform offers lead — they're
 * the featured, curated ones). Either body may be null (that request failed).
 */
export function buildOffers(
  offersBody: unknown,
  platformBody: unknown,
  fromServer = false,
): Offer[] {
  let mapped: Offer[] = [];
  if (offersBody) mapped = listFrom(offersBody, ['data', 'items']).map(mapApiOffer);
  if (platformBody) {
    mapped = [
      ...listFrom(platformBody, ['data']).map((o) => mapPlatformOffer(o, fromServer)),
      ...mapped,
    ];
  }
  return mapped;
}

export function platformHasImages(platformBody: unknown): boolean {
  return listFrom(platformBody, ['data']).some((o: any) => !!o?.imageSignedUrl);
}

/* ── Filter chips + sort ───────────────────────────────────────────── */

export type OfferChip = 'all' | 'instore' | 'takeaway' | 'online' | 'ending' | 'platform';
export type OfferSort = 'featured' | 'ending' | 'discount';

/** "Ending soon" = a running countdown of 3 days or less (matches the old urgent threshold). */
const ENDING_SOON_MS = 3 * 24 * 60 * 60 * 1000;

function endsAt(o: Offer): number {
  const t = o.expiresAt ? Date.parse(o.expiresAt) : NaN;
  return Number.isFinite(t) ? t : Infinity;
}

export function applyOfferView(
  offers: Offer[],
  view: { city: string; type: string; chip: OfferChip; sort: OfferSort },
): Offer[] {
  let list = offers;
  // Business offers are already server-scoped by city. Platform offers have
  // no structured city field (`location` is freeform text), so the city
  // filter is applied client-side by substring match against it.
  if (view.city) {
    const c = view.city.toLowerCase();
    list = list.filter((o) => !o.isPlatform || o.business.toLowerCase().includes(c));
  }
  if (view.type !== 'all') {
    list = list.filter((o) => o.businessType === view.type);
  }

  if (view.chip !== 'all') {
    const now = Date.now();
    switch (view.chip) {
      case 'instore':
        list = list.filter((o) => !!o.channels?.includes('INSTORE'));
        break;
      case 'takeaway':
        list = list.filter((o) => !!o.channels?.includes('TAKEAWAY'));
        break;
      case 'online':
        list = list.filter((o) => !!o.channels?.includes('ONLINE'));
        break;
      case 'ending':
        list = list.filter((o) => {
          const left = endsAt(o) - now;
          return left > 0 && left <= ENDING_SOON_MS;
        });
        break;
      case 'platform':
        list = list.filter((o) => !!o.isPlatform);
        break;
    }
  }

  if (view.sort === 'ending') {
    list = [...list].sort((a, b) => endsAt(a) - endsAt(b));
  } else if (view.sort === 'discount') {
    list = [...list].sort(
      (a, b) => b.discount - a.discount || (b.discountAmount ?? 0) - (a.discountAmount ?? 0),
    );
  }
  return list;
}
