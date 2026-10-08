import { getOpenStatus } from '@saas/types';
import { isFoodCategory } from '@/lib/food-category';

/**
 * Filter model shared by Search, Category and Nearby. Pure functions only —
 * everything here works on the rows the API already returns.
 */

export type SortKey = 'relevant' | 'rating' | 'reviews' | 'newest' | 'nearest';
export type Fulfilment = '' | 'DINE_IN' | 'TAKEAWAY';

export interface Filters {
  /** Only businesses whose listed hours say they are open right now. */
  open: boolean;
  /** Rating 4.0 and above. */
  rating4: boolean;
  halal: boolean;
  /** Only businesses with a live offer of this fulfilment (BOTH offers count for either). */
  fulfilment: Fulfilment;
  sort: SortKey;
  city: string;
  /** Category page only: a subcategory name, sent to the API as a text search inside the category. */
  sub: string;
}

export const DEFAULT_FILTERS: Filters = {
  open: false,
  rating4: false,
  halal: false,
  fulfilment: '',
  sort: 'relevant',
  city: '',
  sub: '',
};

export const SORT_LABELS: Record<SortKey, string> = {
  relevant: 'Most relevant',
  rating: 'Highest rated',
  reviews: 'Most reviewed',
  newest: 'Newest',
  nearest: 'Nearest',
};

const SORT_KEYS = Object.keys(SORT_LABELS) as SortKey[];

type ParamsLike = { get(name: string): string | null };

/** URL → filters. Unknown / malformed values fall back to the default. */
export function parseFilters(sp: ParamsLike): Filters {
  const flag = (k: string) => {
    const v = sp.get(k);
    return v === '1' || v === 'true';
  };
  const sort = sp.get('sort') as SortKey | null;
  const ful = (sp.get('fulfilment') || '').toUpperCase().replace('-', '_');
  return {
    open: flag('open'),
    rating4: sp.get('rating') === '4' || flag('rating4'),
    halal: flag('halal'),
    fulfilment: ful === 'DINE_IN' || ful === 'TAKEAWAY' ? ful : '',
    sort: sort && SORT_KEYS.includes(sort) ? sort : 'relevant',
    city: sp.get('city') || '',
    sub: sp.get('sub') || '',
  };
}

/** Filters → URL params (only non-default values are written). Other params are left untouched. */
export function writeFilters(sp: URLSearchParams, f: Filters, keys: (keyof Filters)[]) {
  const set = (name: string, value: string | null) => {
    if (value) sp.set(name, value);
    else sp.delete(name);
  };
  for (const k of keys) {
    switch (k) {
      case 'open': set('open', f.open ? '1' : null); break;
      case 'rating4': set('rating', f.rating4 ? '4' : null); break;
      case 'halal': set('halal', f.halal ? '1' : null); break;
      case 'fulfilment': set('fulfilment', f.fulfilment ? f.fulfilment.toLowerCase() : null); break;
      case 'sort': set('sort', f.sort !== 'relevant' ? f.sort : null); break;
      case 'city': set('city', f.city || null); break;
      case 'sub': set('sub', f.sub || null); break;
    }
  }
}

export function countActive(f: Filters, keys: (keyof Filters)[], defaultSort: SortKey = 'relevant'): number {
  let n = 0;
  for (const k of keys) {
    if (k === 'sort') {
      if (f.sort !== defaultSort) n++;
    } else if (f[k]) n++;
  }
  return n;
}

/* ── Row readers (tolerant of Postgres rows, Typesense docs and Decimal strings) ── */

export function getRating(b: any): number {
  const n = Number(b?.averageRating ?? b?.avgRating ?? b?.rating ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function getReviews(b: any): number {
  const n = Number(b?.totalReviews ?? b?.reviewCount ?? b?.reviewsCount ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function getCreated(b: any): number {
  const raw = b?.createdAt;
  if (raw == null) return 0;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

export function categoryNameOf(b: any): string {
  return b?.category?.name || b?.categoryName || '';
}

export function isFoodBusiness(b: any): boolean {
  return isFoodCategory({ slug: b?.category?.slug, name: categoryNameOf(b) });
}

export function isOpenNow(b: any, now: Date): boolean {
  return getOpenStatus(b?.operatingHours, now)?.isOpen === true;
}

function matchesFulfilment(b: any, want: Exclude<Fulfilment, ''>): boolean {
  const modes: unknown = b?.offerFulfilments;
  if (!Array.isArray(modes)) return false;
  return modes.includes(want) || modes.includes('BOTH');
}

/** What data the current result set can actually support, so we only offer filters that can work. */
export function detectCapabilities(items: any[]) {
  return {
    hasFood: items.some(isFoodBusiness),
    hasHalalData: items.some((b) => b && 'halalStatus' in b),
    hasFulfilmentData: items.some((b) => b && Array.isArray(b.offerFulfilments)),
  };
}

/** Client-side filters. Server-side ones (city, text, category) are already applied by the API. */
export function applyClientFilters(items: any[], f: Filters, now: Date = new Date()): any[] {
  if (!f.open && !f.rating4 && !f.halal && !f.fulfilment) return items;
  return items.filter((b) => {
    if (f.rating4 && getRating(b) < 4) return false;
    if (f.halal && b?.halalStatus !== 'HALAL') return false;
    if (f.fulfilment && !matchesFulfilment(b, f.fulfilment)) return false;
    if (f.open && !isOpenNow(b, now)) return false;
    return true;
  });
}

/** Stable sort; "relevant" keeps the server order. `distances` is keyed by business id. */
export function sortItems(items: any[], sort: SortKey, distances?: Map<string, number>): any[] {
  if (sort === 'relevant') return items;
  const idx = new Map(items.map((b, i) => [b, i] as const));
  const out = [...items];
  out.sort((a, b) => {
    let d = 0;
    if (sort === 'rating') d = getRating(b) - getRating(a) || getReviews(b) - getReviews(a);
    else if (sort === 'reviews') d = getReviews(b) - getReviews(a);
    else if (sort === 'newest') d = getCreated(b) - getCreated(a);
    else if (sort === 'nearest') {
      d = (distances?.get(a.id) ?? Infinity) - (distances?.get(b.id) ?? Infinity);
      if (Number.isNaN(d)) d = 0;
    }
    return d || (idx.get(a) ?? 0) - (idx.get(b) ?? 0);
  });
  return out;
}

/** Normalises the list envelopes the API returns (array, `{data}`, `{items}`, even double-wrapped) into a plain array. */
export function toList(data: any, depth = 0): any[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object' || depth > 2) return [];
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;
  return toList(data.data, depth + 1);
}

/** Total match count from a paginated envelope, or null when the API did not send one. */
export function totalOf(data: any, depth = 0): number | null {
  if (!data || typeof data !== 'object' || depth > 2) return null;
  const t = data.meta?.total ?? data.pagination?.total ?? data.total;
  if (t != null && Number.isFinite(Number(t))) return Number(t);
  return totalOf(data.data, depth + 1);
}
