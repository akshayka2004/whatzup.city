/**
 * Platform-exclusive offers (Onam specials etc.) created by admins.
 *
 * These are curated vendor deals, not listings owned by a registered business —
 * the vendor may have no platform account at all, so name/location/phone are
 * typed by the admin rather than resolved from a Business row.
 *
 * Field sets come from the client's category spec. Every offer collects a
 * common core (title/location/price/phone/image); the per-category fields below
 * are stored in `PlatformOffer.details`.
 *
 * Keep in sync with the DTO validation in
 * apps/api/src/modules/platform-offers/dto/platform-offer.dto.ts.
 */

export const PLATFORM_OFFER_CATEGORIES = [
  { value: 'SADYA', label: 'Sadya', blurb: 'Onam sadya from hotels, home chefs and caterers' },
  { value: 'PAYASAM', label: 'Payasam', blurb: 'Payasam varieties from hotels, home chefs and caterers' },
  { value: 'CLOTHING', label: 'Clothing', blurb: 'Apparel and fashion deals' },
  { value: 'ELECTRONICS', label: 'Electronics', blurb: 'Electronics and appliance deals' },
  { value: 'STAYCATION', label: 'Staycation', blurb: 'Stays and team day-out packages' },
] as const;

export type PlatformOfferCategory =
  (typeof PLATFORM_OFFER_CATEGORIES)[number]['value'];

/** Staycation splits into two forms with different fields. */
export const STAYCATION_SUBTYPES = [
  { value: 'PROPERTY', label: 'Property Stay', blurb: 'Resorts, villas, homestays' },
  { value: 'DAYOUT', label: 'Day-out Package', blurb: 'Team day-out at a venue' },
] as const;

// ── Sadya ──────────────────────────────────────────────────────────
export const SADYA_PROVIDER_TYPES = [
  'Hotel',
  'Restaurant',
  'Home Chef',
  'Catering',
  'Cloud Kitchen',
] as const;

/**
 * Shown to customers so they know how the vendor operates. The platform does
 * not take orders — these are informational only.
 */
export type DeliveryOption = { key: string; label: string; needsKm?: boolean };

export const SADYA_DELIVERY_OPTIONS: DeliveryOption[] = [
  { key: 'freeDelivery', label: 'Free delivery within range', needsKm: true },
  { key: 'porterUber', label: 'Porter / Uber logistics' },
  { key: 'ownDelivery', label: 'Own delivery' },
  { key: 'aggregators', label: 'Zomato / Swiggy' },
  { key: 'takeaway', label: 'Takeaway' },
];

/** A single named rate line, e.g. {label:'Resort', rate:'₹2500/night'}. */
export type RateLine = { label: string; rate: string };

// ── Staycation: property stay ──────────────────────────────────────
export const STAYCATION_PROPERTY_TYPES = [
  'Resort',
  'Hotel',
  'Bungalow',
  'Holiday Home',
  'Villa',
  'Serviced Apartment',
  'Guest House',
  'Farmhouse',
  'Independent Residence',
] as const;

export const STAYCATION_VIEWS = [
  'Riverfront',
  'Sea Frontage',
  'Lakeside',
  'Hill',
  'City',
  'Forest Side',
  'Farmland View',
] as const;

export const AC_OPTIONS = ['AC', 'Non-AC', 'Both'] as const;

// ── Staycation: day-out package ────────────────────────────────────
export const DAYOUT_VENUE_TYPES = [
  'Hotel',
  'Resort',
  'Bungalow',
  'Casino',
  'Auditorium',
  'Club House',
  'Farmhouse',
] as const;

/** Shape of `PlatformOffer.details`, discriminated by category + subType. */
export type PlatformOfferDetails = {
  // Sadya / Payasam — provider + timing
  providerType?: string;
  availableTiming?: string;

  // Sadya / Payasam — pre-booking, delivery and dine-in each carry their own rate
  hasPreBooking?: boolean;
  preBookingPackage?: string;
  sadhyaTiming?: string;
  preBookingRate?: string;

  hasDelivery?: boolean;
  /** Keys from SADYA_DELIVERY_OPTIONS. */
  deliveryOptions?: string[];
  freeDeliveryKm?: string;
  deliveryRate?: string;

  hasDineIn?: boolean;
  dineInRate?: string;

  // Payasam only
  payasamTypes?: RateLine[];

  // Staycation — property
  propertyTypes?: string[];
  propertyTypeRates?: RateLine[];
  views?: string[];
  minPax?: string;
  maxPax?: string;
  paxSlabRates?: { minPax: string; maxPax: string; rate: string }[];
  acStatus?: string;
  acRate?: string;
  nonAcRate?: string;

  // Staycation — day-out
  venueTypes?: string[];
  venueTypeRates?: RateLine[];
  minTeamCount?: string;
  time?: string;

  // Shared by both staycation sub-types
  amenities?: string;

  // Clothing / Electronics
  brandOrCategory?: string;
};

export type PlatformOffer = {
  id: string;
  category: PlatformOfferCategory;
  subType?: string | null;
  title: string;
  location: string;
  price?: string | null;
  phone?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  details: PlatformOfferDetails;
  status: 'PUBLISHED' | 'UNPUBLISHED';
  createdAt: string;
};

export function categoryLabel(category?: string | null) {
  return PLATFORM_OFFER_CATEGORIES.find((c) => c.value === category)?.label ?? category ?? '—';
}

export function subTypeLabel(subType?: string | null) {
  if (!subType) return null;
  return STAYCATION_SUBTYPES.find((s) => s.value === subType)?.label ?? subType;
}

/** Human summary of a delivery selection, for the public card. */
export function deliverySummary(details?: PlatformOfferDetails): string[] {
  if (!details?.hasDelivery || !details.deliveryOptions?.length) return [];
  return details.deliveryOptions.map((key) => {
    const opt = SADYA_DELIVERY_OPTIONS.find((o) => o.key === key);
    if (!opt) return key;
    if (opt.needsKm && details.freeDeliveryKm) {
      return `Free delivery within ${details.freeDeliveryKm} km`;
    }
    return opt.label;
  });
}

/**
 * Itemized rate lines for public display. Sadya/Payasam and Staycation carry
 * per-option rates instead of one flat price, so the card/modal renders this
 * list wherever it's non-empty.
 */
export function rateLines(category: string, subType: string | null | undefined, details?: PlatformOfferDetails): RateLine[] {
  if (!details) return [];
  const lines: RateLine[] = [];

  if (category === 'SADYA' || category === 'PAYASAM') {
    if (details.hasPreBooking && details.preBookingRate) {
      lines.push({ label: 'Pre-booking', rate: details.preBookingRate });
    }
    if (details.hasDelivery && details.deliveryRate) {
      lines.push({ label: 'Delivery', rate: details.deliveryRate });
    }
    if (details.hasDineIn && details.dineInRate) {
      lines.push({ label: 'Dine-in', rate: details.dineInRate });
    }
    if (category === 'PAYASAM' && details.payasamTypes?.length) {
      lines.push(...details.payasamTypes.filter((p) => p.label && p.rate));
    }
    return lines;
  }

  if (category === 'STAYCATION' && subType === 'PROPERTY') {
    if (details.propertyTypeRates?.length) {
      lines.push(...details.propertyTypeRates.filter((p) => p.label && p.rate));
    }
    if (details.acRate) lines.push({ label: 'AC', rate: details.acRate });
    if (details.nonAcRate) lines.push({ label: 'Non-AC', rate: details.nonAcRate });
    if (details.paxSlabRates?.length) {
      lines.push(
        ...details.paxSlabRates
          .filter((p) => p.rate)
          .map((p) => ({ label: `${p.minPax || '?'}–${p.maxPax || '?'} pax`, rate: p.rate })),
      );
    }
    return lines;
  }

  if (category === 'STAYCATION' && subType === 'DAYOUT') {
    if (details.venueTypeRates?.length) {
      lines.push(...details.venueTypeRates.filter((p) => p.label && p.rate));
    }
    return lines;
  }

  return lines;
}
