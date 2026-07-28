/**
 * Hotel category pricing model. Star classification sets the base listing
 * charge; each selected top-level amenity adds a flat recurring fee on the
 * same billing cycle. Hotel-specific only — not a general category pattern.
 */

export const STAR_PRICING: Record<number, number> = {
  5: 15000,
  4: 12500,
  3: 10000,
  2: 7500,
  1: 5000,
};

export const STAR_OPTIONS = [5, 4, 3, 2, 1];

export const ADDON_PRICE = 2500;

export type HotelAmenityOption = {
  key: string;
  label: string;
  /** Informational sub-choices only — do not affect price. */
  subOptions?: string[];
};

export const HOTEL_AMENITIES: HotelAmenityOption[] = [
  { key: 'staycationRooms', label: 'Staycation (Rooms)', subOptions: ['AC', 'Non-AC'] },
  { key: 'dayoutPackages', label: 'Dayout Packages' },
  { key: 'venue', label: 'Venue', subOptions: ['Open air venues', 'Auditorium', 'Halls', 'Boardrooms'] },
  { key: 'fitness', label: 'Fitness (Gym)' },
  { key: 'spa', label: 'Spa (Wellness)' },
  { key: 'cafe', label: 'Cafe' },
  { key: 'restaurant', label: 'Restaurant', subOptions: ['Alacarte'] },
  { key: 'buffet', label: 'Buffets', subOptions: ['Breakfast', 'Brunch', 'Lunch', 'Dinner'] },
  { key: 'bars', label: 'Bars', subOptions: ['Happy Hours & offers', 'Premium bar', 'Executive bar', 'Local bar'] },
];

export type HotelAmenities = Record<string, { selected?: boolean; subChoices?: string[] }>;

export function computeHotelCharge(starRating: number | undefined | null, amenities: HotelAmenities | undefined | null) {
  const base = starRating ? (STAR_PRICING[starRating] || 0) : 0;
  const selectedCount = amenities
    ? Object.values(amenities).filter((a) => a?.selected).length
    : 0;
  const addons = selectedCount * ADDON_PRICE;
  return { base, addons, selectedCount, total: base + addons };
}
