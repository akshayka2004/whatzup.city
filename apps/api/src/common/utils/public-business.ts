// What anonymous visitors may see of a business. Everything else on the row
// (registration/KYC JSON, owner/billing/support contacts, trial and launch-offer
// state, bill series, audit columns) stays behind authenticated endpoints.
// Allow-list, not deny-list: a new column is private until someone adds it here.

const PUBLIC_FIELDS = [
  'id',
  'tenantId',
  'slug',
  'name',
  'description',
  'status',
  'categoryId',
  'subcategory',
  'address',
  'city',
  'state',
  'district',
  'zipCode',
  'latitude',
  'longitude',
  'googleMapsUrl',
  'phone',
  'website',
  'instagram',
  'whatsapp',
  'socialLinks',
  'tags',
  'halalStatus',
  'hotelStarRating',
  'hotelAmenities',
  'amenityDetails',
  'logo',
  'coverImage',
  'operatingHours',
  'averageRating',
  'totalReviews',
  'isVerified',
  'brandId',
  'brandName',
  'outletLabel',
  'createdAt',
  // Computed by the API for cards / profiles.
  'activeOfferCount',
  'offerFulfilments',
  'distance',
  'distanceKm',
  '_count',
] as const;

const BRANCH_FIELDS = [
  'id',
  'name',
  'address',
  'city',
  'state',
  'latitude',
  'longitude',
  'phone',
  'operatingHours',
] as const;

function pick(src: Record<string, any>, keys: readonly string[]) {
  const out: Record<string, any> = {};
  for (const k of keys) if (src[k] !== undefined) out[k] = src[k];
  return out;
}

export function toPublicBusiness<T extends Record<string, any> | null | undefined>(biz: T): any {
  if (!biz || typeof biz !== 'object') return biz;
  const out = pick(biz, PUBLIC_FIELDS);
  if (biz.category && typeof biz.category === 'object') {
    out.category = pick(biz.category, ['id', 'name', 'slug', 'icon']);
  }
  if (biz.brand && typeof biz.brand === 'object') {
    out.brand = pick(biz.brand, ['id', 'name', 'slug', 'status', 'logo']);
  }
  if (Array.isArray(biz.branches)) {
    out.branches = biz.branches.map((b: any) => pick(b, BRANCH_FIELDS));
  }
  return out;
}

export const PUBLIC_BUSINESS_FIELDS = PUBLIC_FIELDS;
