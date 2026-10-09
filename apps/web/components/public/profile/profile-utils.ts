/**
 * Pure helpers shared by the business-profile sections. No React in here so
 * they can be imported from any client component without pulling extra code.
 */

import { track } from '@/lib/analytics/track';

export const FAVORITES_KEY = 'saved_businesses';

export function getFavIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]').map((b: any) => b.id);
  } catch {
    return [];
  }
}

export function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return 'today';
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
  } catch {
    return '';
  }
}

/** The API wraps lists inconsistently ({data}, {items}, bare array) — normalise. */
export function asList(body: unknown): any[] {
  const b = body as any;
  const list = Array.isArray(b) ? b : (b?.data ?? b?.items ?? []);
  return Array.isArray(list) ? list : [];
}

export function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function branchOf(biz: any) {
  return biz?.branches?.[0];
}

export function addressOf(biz: any): string {
  const branch = branchOf(biz);
  return branch
    ? [branch.address, branch.city, branch.state].filter(Boolean).join(', ')
    : biz?.address || '';
}

export function phoneOf(biz: any): string {
  return biz?.phone || branchOf(biz)?.phone || '';
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function ensureHttp(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** Same search link the page has always used for the address line. */
export function mapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function validCoords(lat: unknown, lng: unknown): [number, number] | null {
  if (lat == null || lng == null || lat === '' || lng === '') return null;
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  if (la === 0 && lo === 0) return null;
  if (Math.abs(la) > 90 || Math.abs(lo) > 180) return null;
  return [la, lo];
}

/** Turn-by-turn link: exact coordinates first, then the owner's map link, then the address text. */
export function directionsUrl(biz: any, branch?: any): string | null {
  const b = branch ?? biz;
  const c = validCoords(b?.latitude, b?.longitude) ?? validCoords(biz?.latitude, biz?.longitude);
  if (c) return `https://www.google.com/maps/dir/?api=1&destination=${c[0]},${c[1]}`;
  if (
    !branch &&
    typeof biz?.googleMapsUrl === 'string' &&
    /^https?:\/\//i.test(biz.googleMapsUrl)
  ) {
    return biz.googleMapsUrl;
  }
  const address = branch
    ? [branch.address, branch.city, branch.state].filter(Boolean).join(', ')
    : addressOf(biz);
  return address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
    : null;
}

/** WhatsApp deep link, only when the listing actually carries a WhatsApp number/link. */
export function whatsappUrl(biz: any): string | null {
  const raw = biz?.whatsapp || biz?.socialLinks?.whatsapp;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const v = raw.trim();
  if (/^https?:\/\//i.test(v)) return v;
  let digits = v.replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return `https://wa.me/${digits}`;
}

/** Fire-and-forget analytics ping. Never blocks or throws. */
export function trackBizEvent(
  biz: any,
  event: string,
  opts: { source?: string; metadata?: Record<string, unknown> } = {},
) {
  if (!biz?.id) return;
  track(event, { businessId: biz.id, ...opts });
}

export function shortDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export type OfferExpiry = {
  /** "Expires 12 Oct" / "Valid until 12 Oct" — the wording the page has always used. */
  label: string;
  /** Urgency chip text, only when the end is close or already passed. */
  urgency: string | null;
  tone: 'warning' | 'danger' | null;
};

export function offerExpiry(o: any): OfferExpiry | null {
  const raw = o?.expiresAt || o?.validUntil;
  if (!raw) return null;
  const label = o.expiresAt
    ? `Expires ${shortDate(o.expiresAt)}`
    : `Valid until ${shortDate(o.validUntil)}`;
  const end = new Date(raw).getTime();
  if (!Number.isFinite(end)) return { label, urgency: null, tone: null };
  const ms = end - Date.now();
  if (ms < 0) return { label, urgency: 'Expired', tone: 'danger' };
  const days = Math.ceil(ms / 86400000);
  if (days <= 1) return { label, urgency: 'Ends today', tone: 'warning' };
  if (days <= 3) return { label, urgency: `Ends in ${days} days`, tone: 'warning' };
  return { label, urgency: null, tone: null };
}

export type SocialKind = 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'youtube' | 'website';
export type SocialLink = { kind: SocialKind; href: string; text: string };

const str = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/** Same sources and link rules the page has always used, just collected into one list. */
export function socialLinksOf(biz: any): SocialLink[] {
  const sl = biz?.socialLinks || {};
  const out: SocialLink[] = [];

  if (str(biz?.instagram)) {
    out.push({
      kind: 'instagram',
      href: `https://instagram.com/${biz.instagram.replace('@', '')}`,
      text: biz.instagram.startsWith('@') ? biz.instagram : `@${biz.instagram}`,
    });
  } else if (str(sl.instagram)) {
    out.push({
      kind: 'instagram',
      href: `https://instagram.com/${sl.instagram.replace('@', '')}`,
      text: sl.instagram,
    });
  }
  if (str(sl.facebook)) {
    out.push({
      kind: 'facebook',
      href: sl.facebook.startsWith('http') ? sl.facebook : `https://facebook.com/${sl.facebook}`,
      text: sl.facebook,
    });
  }
  const tw = sl.twitter || sl.x;
  if (str(tw)) {
    out.push({
      kind: 'twitter',
      href: tw.startsWith('http') ? tw : `https://x.com/${tw.replace('@', '')}`,
      text: tw,
    });
  }
  if (str(sl.linkedin)) {
    out.push({
      kind: 'linkedin',
      href: sl.linkedin.startsWith('http')
        ? sl.linkedin
        : `https://linkedin.com/company/${sl.linkedin}`,
      text: sl.linkedin,
    });
  }
  if (str(sl.youtube)) {
    out.push({
      kind: 'youtube',
      href: sl.youtube.startsWith('http') ? sl.youtube : `https://${sl.youtube}`,
      text: sl.youtube,
    });
  }
  if (str(biz?.website)) {
    out.push({ kind: 'website', href: ensureHttp(biz.website), text: biz.website });
  } else if (str(sl.website)) {
    out.push({ kind: 'website', href: ensureHttp(sl.website), text: sl.website });
  }
  return out;
}

export function formatPrice(v: unknown): string {
  const n = Number(v);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '';
}
