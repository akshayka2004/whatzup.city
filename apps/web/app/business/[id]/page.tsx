import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SITE_URL, serverGet, serverIsNotFound, unwrapOne } from '@/lib/server-api';
import BusinessClient from './business-client';

// Cached + re-rendered at most every 2 minutes; the client refreshes live data itself.
export const revalidate = 120;

type RouteParams = { id: string };

const DAYS = [
  ['mon', 'Monday'],
  ['tue', 'Tuesday'],
  ['wed', 'Wednesday'],
  ['thu', 'Thursday'],
  ['fri', 'Friday'],
  ['sat', 'Saturday'],
  ['sun', 'Sunday'],
] as const;

/**
 * Server fetch of the public business. Never throws — null means "let the client fetch it".
 * Wrapped in cache() so generateMetadata and the page share one request.
 */
const getBusiness = cache(async (id: string): Promise<any | null> => {
  if (!id) return null;
  const body = await serverGet(`/v1/businesses/${encodeURIComponent(id)}`, { revalidate: 120 });
  const biz = unwrapOne<any>(body);
  return biz && typeof biz === 'object' && typeof biz.name === 'string' ? biz : null;
});

const isHttp = (v: unknown): v is string => typeof v === 'string' && /^https?:\/\//i.test(v);

function trimDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 100 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–-]+$/, '')}…`;
}

function placeLine(biz: any): string {
  const category = biz.category?.name;
  const city = biz.city;
  return [category, city && `in ${city}`].filter(Boolean).join(' ');
}

/**
 * Only what the profile actually renders. The public API returns the whole
 * business row; none of the rest belongs in the page's HTML / RSC payload.
 */
function pickPublic(biz: any) {
  const branches = Array.isArray(biz.branches)
    ? biz.branches.map((b: any) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        city: b.city,
        state: b.state,
        latitude: b.latitude,
        longitude: b.longitude,
        phone: b.phone,
        operatingHours: b.operatingHours,
      }))
    : [];
  return {
    id: biz.id,
    tenantId: biz.tenantId,
    slug: biz.slug,
    name: biz.name,
    description: biz.description,
    status: biz.status,
    categoryId: biz.categoryId,
    category: biz.category
      ? { id: biz.category.id, name: biz.category.name, slug: biz.category.slug }
      : null,
    subcategory: biz.subcategory,
    address: biz.address,
    city: biz.city,
    state: biz.state,
    district: biz.district,
    latitude: biz.latitude,
    longitude: biz.longitude,
    googleMapsUrl: biz.googleMapsUrl,
    phone: biz.phone,
    website: biz.website,
    instagram: biz.instagram,
    whatsapp: biz.whatsapp,
    socialLinks: biz.socialLinks,
    tags: biz.tags,
    halalStatus: biz.halalStatus,
    hotelStarRating: biz.hotelStarRating,
    hotelAmenities: biz.hotelAmenities,
    amenityDetails: biz.amenityDetails,
    logo: biz.logo,
    coverImage: biz.coverImage,
    operatingHours: biz.operatingHours,
    averageRating: biz.averageRating,
    totalReviews: biz.totalReviews,
    isVerified: biz.isVerified,
    brandId: biz.brandId,
    brand: biz.brand,
    branches,
    _count: biz._count,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { id } = await params;
  const biz = await getBusiness(id);
  if (!biz) {
    // A definite 404 from the API becomes a real 404 (crawlers get the status,
    // since metadata blocks for them). Anything else is treated as a blip:
    // generic title, no robots directive, and the client fetches.
    if (await serverIsNotFound(`/v1/businesses/${encodeURIComponent(id)}`)) notFound();
    return { title: 'Business', alternates: { canonical: `/business/${id}` } };
  }

  const place = placeLine(biz);
  const title = place ? `${biz.name} — ${place}` : biz.name;
  const description = biz.description
    ? trimDescription(String(biz.description))
    : `${biz.name}${place ? ` — ${place}` : ''}. See offers, reviews and opening hours on Whtzup.city.`;
  const url = `/business/${id}`;
  const indexable = biz.status === 'APPROVED';

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: indexable ? undefined : { index: false, follow: false },
    openGraph: {
      type: 'website',
      siteName: 'Whtzup.city',
      title,
      description,
      url,
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function buildJsonLd(biz: any, id: string) {
  const categoryText = `${biz.category?.name || ''} ${biz.category?.slug || ''}`.toLowerCase();
  const type = /hotel|resort|lodg|homestay|stay\b/.test(categoryText)
    ? 'Hotel'
    : /restaurant|food|cafe|café|bakery|dining|kitchen|caterer|sweets|biryani|tea|juice/.test(
          categoryText,
        )
      ? 'Restaurant'
      : 'LocalBusiness';

  const images = [biz.coverImage, biz.logo].filter(isHttp);
  const lat = Number(biz.latitude);
  const lng = Number(biz.longitude);
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

  const sameAs = [
    biz.website,
    biz.socialLinks?.facebook,
    biz.socialLinks?.instagram,
    biz.socialLinks?.twitter,
    biz.socialLinks?.x,
    biz.socialLinks?.linkedin,
    biz.socialLinks?.youtube,
  ].filter(isHttp);

  // operatingHours.weekly: { mon: { closed, shifts: [{ open, close }] }, ... }
  const opening: any[] = [];
  const weekly = biz.operatingHours?.weekly;
  if (weekly && typeof weekly === 'object') {
    for (const [key, label] of DAYS) {
      const day = weekly[key];
      if (!day || day.closed || !Array.isArray(day.shifts)) continue;
      for (const s of day.shifts) {
        if (typeof s?.open !== 'string' || typeof s?.close !== 'string') continue;
        opening.push({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: label,
          opens: s.open,
          closes: s.close === '24:00' ? '23:59' : s.close,
        });
      }
    }
  }

  const reviewCount = Number(biz.totalReviews ?? biz._count?.reviews) || 0;
  const rating = Number(biz.averageRating) || 0;

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': type,
    name: biz.name,
    url: `${SITE_URL}/business/${id}`,
  };
  if (biz.description) data.description = trimDescription(String(biz.description), 300);
  if (images.length) data.image = images;
  if (biz.phone) data.telephone = biz.phone;
  if (biz.address || biz.city) {
    data.address = {
      '@type': 'PostalAddress',
      streetAddress: biz.address || undefined,
      addressLocality: biz.city || undefined,
      addressRegion: biz.state || undefined,
      postalCode: biz.zipCode || undefined,
      addressCountry: 'IN',
    };
  }
  if (hasGeo) data.geo = { '@type': 'GeoCoordinates', latitude: lat, longitude: lng };
  if (opening.length) data.openingHoursSpecification = opening;
  if (sameAs.length) data.sameAs = sameAs;
  if (reviewCount > 0 && rating > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(rating.toFixed(1)),
      bestRating: 5,
      worstRating: 1,
      ratingCount: reviewCount,
      reviewCount,
    };
  }
  return data;
}

export default async function BusinessPage({ params }: { params: Promise<RouteParams> }) {
  const { id } = await params;
  const biz = await getBusiness(id);

  let jsonLd: string | null = null;
  if (biz) {
    try {
      // "<" escaped so a business name can never close the script tag.
      jsonLd = JSON.stringify(buildJsonLd(biz, id)).replace(/</g, '\\u003c');
    } catch {
      jsonLd = null;
    }
  }

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />}
      <BusinessClient businessId={id} initialBusiness={biz ? pickPublic(biz) : null} />
    </>
  );
}
