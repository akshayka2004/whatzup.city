// =============================================================
// Document Requirement Matrix (Iteration 2)
// =============================================================
// Encodes the category-aware verification requirements. Every business uploads
// the universal Business Address Proof; each category additionally requires ONE
// category-specific document. Consumed by the registration flow (to show the
// right requirement) and the admin verification center.
// =============================================================

import { CATEGORY_TEMPLATES, SLUG_TEMPLATE, isTemplateKey } from '@saas/types';

export interface DocRequirement {
  /** Stable subtype code stored in business_documents.document_subtype */
  code: string;
  /** Human label shown in the UI */
  label: string;
  /** Whether the business must provide this to be verified */
  mandatory: boolean;
  /** If the requirement is "one of" several, the alternatives */
  oneOf?: { code: string; label: string }[];
}

// Universal document — mandatory for ALL businesses.
export const UNIVERSAL_DOCUMENT: DocRequirement = {
  code: 'BUSINESS_ADDRESS_PROOF',
  label: 'Business Address Proof (Trade License / GST / Company Registration)',
  mandatory: true,
};

// Category slug → the single additional category-specific requirement.
export const CATEGORY_DOCUMENTS: Record<string, DocRequirement> = {
  food: { code: 'FSSAI_LICENSE', label: 'FSSAI License', mandatory: true },
  buffet: { code: 'FSSAI_LICENSE', label: 'FSSAI License', mandatory: true },
  healthcare: {
    code: 'HEALTHCARE_REGISTRATION',
    label: 'Healthcare Registration',
    mandatory: true,
    oneOf: [
      { code: 'CLINICAL_ESTABLISHMENT_REGISTRATION', label: 'Clinical Establishment Registration' },
      { code: 'PHARMACY_LICENSE', label: 'Pharmacy License' },
      { code: 'MEDICAL_REGISTRATION', label: 'Medical Registration' },
      { code: 'DIAGNOSTIC_CENTER_REGISTRATION', label: 'Diagnostic Center Registration' },
    ],
  },
  staycation: {
    code: 'STAYCATION_REGISTRATION',
    label: 'Trade License or Tourism Registration',
    mandatory: true,
    oneOf: [
      { code: 'TRADE_LICENSE', label: 'Trade License' },
      { code: 'TOURISM_REGISTRATION', label: 'Tourism Registration' },
    ],
  },
  venue_spots: {
    code: 'VENUE_CLEARANCE',
    label: 'Trade License or Fire Safety Clearance',
    mandatory: true,
    oneOf: [
      { code: 'TRADE_LICENSE', label: 'Trade License' },
      { code: 'FIRE_SAFETY_CLEARANCE', label: 'Fire Safety Clearance' },
    ],
  },
  fitness_wellness: {
    code: 'FITNESS_CERTIFICATION',
    label: 'Trade License or Professional Certification',
    mandatory: true,
    oneOf: [
      { code: 'TRADE_LICENSE', label: 'Trade License' },
      { code: 'PROFESSIONAL_CERTIFICATION', label: 'Professional Certification' },
    ],
  },
  real_estate: {
    code: 'REAL_ESTATE_REGISTRATION',
    label: 'Trade License or RERA Registration',
    mandatory: true,
    oneOf: [
      { code: 'TRADE_LICENSE', label: 'Trade License' },
      { code: 'RERA_REGISTRATION', label: 'RERA Registration' },
    ],
  },
  automotive_services: { code: 'TRADE_LICENSE', label: 'Trade License', mandatory: true },
  fashion: { code: 'TRADE_LICENSE', label: 'Trade License', mandatory: true },
  retail_gifts: { code: 'TRADE_LICENSE', label: 'Trade License', mandatory: true },
  local_shop: { code: 'TRADE_LICENSE', label: 'Trade License', mandatory: true },
  events: { code: 'TRADE_LICENSE', label: 'Trade License', mandatory: true },
  personal_care: { code: 'TRADE_LICENSE', label: 'Trade License', mandatory: true },
  // Business Services splits by subcategory (insurance vs loan).
  business_services: {
    code: 'BUSINESS_SERVICES_AUTHORIZATION',
    label: 'IRDAI (insurance) or RBI/NBFC + Corporate Authorization (loans)',
    mandatory: true,
    oneOf: [
      { code: 'IRDAI_REGISTRATION', label: 'IRDAI Registration (Insurance)' },
      { code: 'RBI_NBFC_AUTHORIZATION', label: 'RBI / NBFC Authorization (Loans)' },
      { code: 'CORPORATE_AUTHORIZATION', label: 'Corporate Authorization Document (Loans)' },
    ],
  },
};

const TRADE_LICENSE: DocRequirement = {
  code: 'TRADE_LICENSE',
  label: 'Trade License',
  mandatory: true,
};

/**
 * Returns the full requirement set for a category slug: the universal proof plus
 * the category-specific document (if any).
 *
 * Order: the slug table above (built-in categories, unchanged) → a built-in slug without an entry
 * keeps the Trade License it always had → a category a super admin created uses its template's
 * document → Trade License.
 */
export function getRequirementsForCategory(
  categorySlug?: string,
  templateKey?: string | null,
): {
  universal: DocRequirement;
  categorySpecific: DocRequirement | null;
} {
  const slug = (categorySlug || '').toLowerCase();
  let categorySpecific: DocRequirement | null = null;
  if (slug) {
    if (CATEGORY_DOCUMENTS[slug]) categorySpecific = CATEGORY_DOCUMENTS[slug];
    else if (slug in SLUG_TEMPLATE) categorySpecific = TRADE_LICENSE;
    else if (isTemplateKey(templateKey))
      categorySpecific = CATEGORY_TEMPLATES[templateKey].document;
    else categorySpecific = TRADE_LICENSE;
  }
  return { universal: UNIVERSAL_DOCUMENT, categorySpecific };
}
