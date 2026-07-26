/**
 * Category-specific "Status" attributes shown during business registration and
 * in settings. Keyed by category slug; falls back to DEFAULT for any category
 * without a specific entry. Edit freely — this is the single source of truth.
 *
 * type 'single'  → one choice (radio / select)
 * type 'boolean' → Yes/No toggle
 * type 'multi'   → many choices (checkbox group)
 */
export type AttrType = 'single' | 'boolean' | 'multi';
export type CategoryAttribute = {
  key: string;
  label: string;
  type: AttrType;
  options?: string[];
};

const PARKING = ['Street', 'Valet', 'Roadside', 'Parking Lot', 'None'];

const RESTAURANT: CategoryAttribute[] = [
  { key: 'ac', label: 'Air conditioning', type: 'single', options: ['AC', 'Non-AC', 'Partial'] },
  { key: 'vegType', label: 'Veg preference', type: 'single', options: ['Pure Veg', 'Veg & Non-Veg', 'Non-Veg'] },
  { key: 'parking', label: 'Parking', type: 'multi', options: PARKING },
  { key: 'service', label: 'Service options', type: 'multi', options: ['Dine-in', 'Takeaway', 'Delivery', 'Outdoor seating'] },
];

const RETAIL: CategoryAttribute[] = [
  { key: 'ac', label: 'Air conditioning', type: 'boolean' },
  { key: 'homeDelivery', label: 'Home delivery', type: 'boolean' },
  { key: 'cardUpi', label: 'Card / UPI accepted', type: 'boolean' },
  { key: 'parking', label: 'Parking', type: 'multi', options: PARKING },
];

const HEALTHCARE: CategoryAttribute[] = [
  { key: 'emergency', label: '24×7 emergency', type: 'boolean' },
  { key: 'ambulance', label: 'Ambulance', type: 'boolean' },
  { key: 'pharmacy', label: 'On-site pharmacy', type: 'boolean' },
  { key: 'wheelchair', label: 'Wheelchair access', type: 'boolean' },
  { key: 'insurance', label: 'Insurance accepted', type: 'boolean' },
];

const SERVICES: CategoryAttribute[] = [
  { key: 'homeService', label: 'Home service', type: 'boolean' },
  { key: 'appointment', label: 'Appointment required', type: 'boolean' },
  { key: 'onlineBooking', label: 'Online booking', type: 'boolean' },
];

const FITNESS: CategoryAttribute[] = [
  { key: 'ac', label: 'Air conditioning', type: 'boolean' },
  { key: 'trainers', label: 'Trainers available', type: 'boolean' },
  { key: 'freeTrial', label: 'Free trial', type: 'boolean' },
  { key: 'parking', label: 'Parking', type: 'multi', options: PARKING },
];

const EDUCATION: CategoryAttribute[] = [
  { key: 'mode', label: 'Mode', type: 'multi', options: ['Online', 'Offline', 'Hybrid'] },
  { key: 'hostel', label: 'Hostel', type: 'boolean' },
  { key: 'transport', label: 'Transport', type: 'boolean' },
];

const AUTOMOTIVE: CategoryAttribute[] = [
  { key: 'pickupDrop', label: 'Pickup & drop', type: 'boolean' },
  { key: 'open247', label: '24×7', type: 'boolean' },
  { key: 'warranty', label: 'Warranty', type: 'boolean' },
];

const DEFAULT: CategoryAttribute[] = [
  { key: 'wheelchair', label: 'Wheelchair accessible', type: 'boolean' },
  { key: 'wifi', label: 'Wi-Fi', type: 'boolean' },
  { key: 'parking', label: 'Parking', type: 'multi', options: PARKING },
];

// Map many category slugs onto a shared attribute set.
const BY_SLUG: Record<string, CategoryAttribute[]> = {
  restaurants: RESTAURANT, food: RESTAURANT, buffet: RESTAURANT, staycation: RESTAURANT,
  retail: RETAIL, shopping: RETAIL, retail_gifts: RETAIL, local_shop: RETAIL, fashion: RETAIL,
  healthcare: HEALTHCARE,
  services: SERVICES, business_services: SERVICES, personal_care: SERVICES,
  fitness_wellness: FITNESS,
  education: EDUCATION,
  automotive_services: AUTOMOTIVE,
};

export function getCategoryAttributes(categorySlug?: string | null): CategoryAttribute[] {
  if (!categorySlug) return DEFAULT;
  return BY_SLUG[categorySlug] ?? DEFAULT;
}
