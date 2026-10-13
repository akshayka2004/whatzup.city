// ============================================================
// Category templates — what a category "behaves like".
//
// A category created by a super admin has no code of its own, so it picks a
// template that brings: the status fields shown at registration/settings, the
// category-specific verification document, and whether it is a food business
// (drives Dine-in/Takeaway offers and menu photos).
//
// Shared by the API (documents, food check) and the web app (fields, labels).
// Existing categories were backfilled from SLUG_TEMPLATE below, so nothing
// changed for them when templates were introduced.
// ============================================================

export type AttrType = 'single' | 'boolean' | 'multi';

export interface CategoryAttribute {
  key: string;
  label: string;
  type: AttrType;
  options?: string[];
}

export interface TemplateDocument {
  /** Stable subtype code stored in business_documents.document_subtype */
  code: string;
  label: string;
  mandatory: boolean;
  /** "one of" alternatives */
  oneOf?: { code: string; label: string }[];
}

export const CATEGORY_TEMPLATE_KEYS = [
  'RESTAURANT',
  'RETAIL',
  'HEALTHCARE',
  'SERVICES',
  'FITNESS',
  'EDUCATION',
  'AUTOMOTIVE',
  'GENERIC',
] as const;

export type CategoryTemplateKey = (typeof CATEGORY_TEMPLATE_KEYS)[number];

export interface CategoryTemplate {
  key: CategoryTemplateKey;
  label: string;
  /** One line for the admin picker. */
  description: string;
  attributes: CategoryAttribute[];
  document: TemplateDocument;
  isFood: boolean;
}

const PARKING = ['Street', 'Valet', 'Roadside', 'Parking Lot', 'None'];

const TRADE_LICENSE: TemplateDocument = {
  code: 'TRADE_LICENSE',
  label: 'Trade License',
  mandatory: true,
};

export const CATEGORY_TEMPLATES: Record<CategoryTemplateKey, CategoryTemplate> = {
  RESTAURANT: {
    key: 'RESTAURANT',
    label: 'Food & restaurants',
    description: 'AC, veg preference, parking, dine-in/takeaway. Needs an FSSAI licence.',
    isFood: true,
    document: { code: 'FSSAI_LICENSE', label: 'FSSAI License', mandatory: true },
    attributes: [
      {
        key: 'ac',
        label: 'Air conditioning',
        type: 'single',
        options: ['AC', 'Non-AC', 'Partial'],
      },
      {
        key: 'vegType',
        label: 'Veg preference',
        type: 'single',
        options: ['Pure Veg', 'Veg & Non-Veg', 'Non-Veg'],
      },
      { key: 'parking', label: 'Parking', type: 'multi', options: PARKING },
      {
        key: 'service',
        label: 'Service options',
        type: 'multi',
        options: ['Dine-in', 'Takeaway', 'Delivery', 'Outdoor seating'],
      },
    ],
  },
  RETAIL: {
    key: 'RETAIL',
    label: 'Shops & retail',
    description: 'AC, home delivery, card/UPI, parking. Needs a trade licence.',
    isFood: false,
    document: TRADE_LICENSE,
    attributes: [
      { key: 'ac', label: 'Air conditioning', type: 'boolean' },
      { key: 'homeDelivery', label: 'Home delivery', type: 'boolean' },
      { key: 'cardUpi', label: 'Card / UPI accepted', type: 'boolean' },
      { key: 'parking', label: 'Parking', type: 'multi', options: PARKING },
    ],
  },
  HEALTHCARE: {
    key: 'HEALTHCARE',
    label: 'Healthcare',
    description: 'Emergency, ambulance, pharmacy, insurance. Needs a healthcare registration.',
    isFood: false,
    document: {
      code: 'HEALTHCARE_REGISTRATION',
      label: 'Healthcare Registration',
      mandatory: true,
      oneOf: [
        {
          code: 'CLINICAL_ESTABLISHMENT_REGISTRATION',
          label: 'Clinical Establishment Registration',
        },
        { code: 'PHARMACY_LICENSE', label: 'Pharmacy License' },
        { code: 'MEDICAL_REGISTRATION', label: 'Medical Registration' },
        { code: 'DIAGNOSTIC_CENTER_REGISTRATION', label: 'Diagnostic Center Registration' },
      ],
    },
    attributes: [
      { key: 'emergency', label: '24×7 emergency', type: 'boolean' },
      { key: 'ambulance', label: 'Ambulance', type: 'boolean' },
      { key: 'pharmacy', label: 'On-site pharmacy', type: 'boolean' },
      { key: 'wheelchair', label: 'Wheelchair access', type: 'boolean' },
      { key: 'insurance', label: 'Insurance accepted', type: 'boolean' },
    ],
  },
  SERVICES: {
    key: 'SERVICES',
    label: 'Services',
    description: 'Home service, appointments, online booking. Needs a trade licence.',
    isFood: false,
    document: TRADE_LICENSE,
    attributes: [
      { key: 'homeService', label: 'Home service', type: 'boolean' },
      { key: 'appointment', label: 'Appointment required', type: 'boolean' },
      { key: 'onlineBooking', label: 'Online booking', type: 'boolean' },
    ],
  },
  FITNESS: {
    key: 'FITNESS',
    label: 'Fitness & wellness',
    description: 'AC, trainers, free trial, parking. Needs a trade licence or certification.',
    isFood: false,
    document: {
      code: 'FITNESS_CERTIFICATION',
      label: 'Trade License or Professional Certification',
      mandatory: true,
      oneOf: [
        { code: 'TRADE_LICENSE', label: 'Trade License' },
        { code: 'PROFESSIONAL_CERTIFICATION', label: 'Professional Certification' },
      ],
    },
    attributes: [
      { key: 'ac', label: 'Air conditioning', type: 'boolean' },
      { key: 'trainers', label: 'Trainers available', type: 'boolean' },
      { key: 'freeTrial', label: 'Free trial', type: 'boolean' },
      { key: 'parking', label: 'Parking', type: 'multi', options: PARKING },
    ],
  },
  EDUCATION: {
    key: 'EDUCATION',
    label: 'Education',
    description: 'Online/offline mode, hostel, transport. Needs a trade licence.',
    isFood: false,
    document: TRADE_LICENSE,
    attributes: [
      { key: 'mode', label: 'Mode', type: 'multi', options: ['Online', 'Offline', 'Hybrid'] },
      { key: 'hostel', label: 'Hostel', type: 'boolean' },
      { key: 'transport', label: 'Transport', type: 'boolean' },
    ],
  },
  AUTOMOTIVE: {
    key: 'AUTOMOTIVE',
    label: 'Automotive',
    description: 'Pickup & drop, 24×7, warranty. Needs a trade licence.',
    isFood: false,
    document: TRADE_LICENSE,
    attributes: [
      { key: 'pickupDrop', label: 'Pickup & drop', type: 'boolean' },
      { key: 'open247', label: '24×7', type: 'boolean' },
      { key: 'warranty', label: 'Warranty', type: 'boolean' },
    ],
  },
  GENERIC: {
    key: 'GENERIC',
    label: 'General business',
    description: 'Wheelchair access, Wi-Fi, parking. Needs a trade licence.',
    isFood: false,
    document: TRADE_LICENSE,
    attributes: [
      { key: 'wheelchair', label: 'Wheelchair accessible', type: 'boolean' },
      { key: 'wifi', label: 'Wi-Fi', type: 'boolean' },
      { key: 'parking', label: 'Parking', type: 'multi', options: PARKING },
    ],
  },
};

/**
 * Template every built-in slug behaved like before templates existed. Used to backfill
 * `categories.template`, and as the fallback for any row whose template is still empty.
 */
export const SLUG_TEMPLATE: Record<string, CategoryTemplateKey> = {
  restaurants: 'RESTAURANT',
  food: 'RESTAURANT',
  buffet: 'RESTAURANT',
  staycation: 'RESTAURANT',
  retail: 'RETAIL',
  shopping: 'RETAIL',
  retail_gifts: 'RETAIL',
  local_shop: 'RETAIL',
  fashion: 'RETAIL',
  healthcare: 'HEALTHCARE',
  services: 'SERVICES',
  business_services: 'SERVICES',
  personal_care: 'SERVICES',
  fitness_wellness: 'FITNESS',
  education: 'EDUCATION',
  automotive_services: 'AUTOMOTIVE',
};

/** Slugs that application code depends on (registration rules, pricing, halal …). Not deletable, slug locked. */
export const SYSTEM_CATEGORY_SLUGS = [
  'food',
  'restaurants',
  'home_chefs',
  'hotel',
  'staycation',
  'buffet',
] as const;

const FOOD_CATEGORY_RE = /food|restaurant|cafe|bakery|buffet|catering|dining|kitchen|hotel/i;

/**
 * Is this a food business (Dine-in/Takeaway offers, menu photos)? Built-in categories keep the
 * name/slug rule they always had; a category a super admin created has no slug the rule knows, so
 * its RESTAURANT template decides.
 */
export function isFoodCategory(
  category?: { slug?: string | null; name?: string | null; template?: string | null } | null,
): boolean {
  if (!category) return false;
  if (FOOD_CATEGORY_RE.test(category.slug || '') || FOOD_CATEGORY_RE.test(category.name || '')) {
    return true;
  }
  return category.template === 'RESTAURANT' && !((category.slug ?? '') in SLUG_TEMPLATE);
}

export function isTemplateKey(v: unknown): v is CategoryTemplateKey {
  return typeof v === 'string' && (CATEGORY_TEMPLATE_KEYS as readonly string[]).includes(v);
}

/**
 * Template for a category: its own, else the parent's, else the legacy slug map, else GENERIC.
 * (A subcategory inherits its parent's behaviour unless it sets its own.)
 */
export function resolveTemplate(
  category?: { slug?: string | null; template?: string | null } | null,
  parent?: { slug?: string | null; template?: string | null } | null,
): CategoryTemplate {
  const own = category?.template;
  if (isTemplateKey(own)) return CATEGORY_TEMPLATES[own];
  const par = parent?.template;
  if (isTemplateKey(par)) return CATEGORY_TEMPLATES[par];
  const bySlug = SLUG_TEMPLATE[category?.slug ?? ''] ?? SLUG_TEMPLATE[parent?.slug ?? ''];
  return CATEGORY_TEMPLATES[bySlug ?? 'GENERIC'];
}
