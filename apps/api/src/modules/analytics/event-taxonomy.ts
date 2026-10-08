/**
 * The analytics event vocabulary. Ingestion rejects anything not listed here, so typos and
 * junk never reach the table. Some names have legacy aliases already stored in production;
 * queries always read the whole alias group, so old and new rows count together.
 */
export const EVENT_GROUPS = {
  /** Someone opened a business profile page. */
  profileView: ['BUSINESS_VIEW', 'PROFILE_VIEW'],
  /** A listing card was rendered in search/browse/home results. */
  impression: ['LISTING_IMPRESSION'],
  /** A listing card was clicked through to the profile. */
  cardClick: ['CARD_CLICK', 'BUSINESS_CLICK', 'SEARCH_CLICK'],
  call: ['PHONE_CLICK', 'CALL_CLICK'],
  directions: ['DIRECTIONS_CLICK'],
  whatsapp: ['WHATSAPP_CLICK'],
  website: ['WEBSITE_CLICK'],
  share: ['SHARE', 'SHARE_CLICK'],
  save: ['SAVE', 'FAVORITE_ADD'],
  qrScan: ['QR_SCAN'],
  offerView: ['OFFER_VIEW'],
  eventView: ['EVENT_VIEW'],
  search: ['SEARCH', 'SEARCH_QUERY'],
} as const;

export type EventGroup = keyof typeof EVENT_GROUPS;

/** "Customer actions" in the Google Business Profile sense: someone tried to reach you. */
export const ACTION_GROUPS: EventGroup[] = ['call', 'directions', 'whatsapp', 'website'];

export const ALLOWED_EVENTS = new Set<string>([
  ...Object.values(EVENT_GROUPS).flat(),
  // Legacy names still read by older services; accepted so nothing breaks.
  'PAGE_VIEW',
  'CLICK_LINK',
  'OFFER_CLICK',
  'SEARCH_NO_RESULTS',
]);

export function eventsFor(...groups: EventGroup[]): string[] {
  return groups.flatMap((g) => [...EVENT_GROUPS[g]]);
}

export function groupOf(event: string): EventGroup | null {
  for (const [g, names] of Object.entries(EVENT_GROUPS)) {
    if ((names as readonly string[]).includes(event)) return g as EventGroup;
  }
  return null;
}

const BOT_UA =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp\/|telegrambot|embedly|quora link preview|pinterest|vkshare|w3c_validator|headless|lighthouse|pagespeed|gtmetrix|python-requests|curl\/|wget\/|axios\/|node-fetch|go-http-client|java\/|okhttp|playwright|puppeteer|phantomjs|selenium/i;

/** Conservative UA bot check. Empty UA counts as bot (real browsers always send one). */
export function isBotUserAgent(ua?: string | null): boolean {
  if (!ua || ua.length < 10) return true;
  return BOT_UA.test(ua);
}

export function deviceOf(ua?: string | null): 'mobile' | 'tablet' | 'desktop' | 'unknown' {
  if (!ua) return 'unknown';
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android/i.test(ua)) return 'mobile';
  return 'desktop';
}

const SOURCES = new Set(['home', 'search', 'category', 'nearby', 'offers', 'events', 'qr', 'share', 'related', 'favorites', 'direct', 'external']);

/** Normalises the client-sent source; anything unknown becomes 'other'. */
export function normaliseSource(src?: unknown): string {
  if (typeof src !== 'string') return 'direct';
  const s = src.toLowerCase().slice(0, 30);
  return SOURCES.has(s) ? s : 'other';
}
