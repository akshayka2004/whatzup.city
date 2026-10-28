import { NextResponse } from 'next/server';
import { SITE_URL, serverGet, serverIsNotFound, unwrapOne } from '@/lib/server-api';

// Business QR codes point here: platform.whtzup.city/b/K7M3Q9. Same characters as the API's
// generator (no I, L, O, 0, 1).
const CODE_RE = /^[A-HJKMNP-Z2-9]{4,12}$/;

/**
 * Sends a scanned business QR to the business's public page. The redirect is built on the fixed
 * public address (not the request's host, which behind the proxy is 127.0.0.1) and cached for
 * five minutes at the edge, so a busy QR does not reach the server on every scan.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const clean = code.toUpperCase();

  const go = (path: string, cache: string) =>
    NextResponse.redirect(new URL(path, SITE_URL), {
      status: 302,
      headers: { 'Cache-Control': cache },
    });

  if (!CODE_RE.test(clean)) {
    return go('/qr-unavailable?reason=missing', 'public, s-maxage=3600');
  }

  const found = unwrapOne<{ id?: string }>(
    await serverGet(`/v1/businesses/by-code/${clean}`, { revalidate: 300 }),
  );
  if (found?.id) {
    return go(`/business/${found.id}?src=qr`, 'public, s-maxage=300, stale-while-revalidate=3600');
  }

  // Not found is permanent enough to cache briefly; an API hiccup must not be cached at all.
  const missing = await serverIsNotFound(`/v1/businesses/by-code/${clean}`, { revalidate: 60 });
  return missing
    ? go('/qr-unavailable?reason=missing', 'public, s-maxage=60')
    : go('/qr-unavailable?reason=down', 'no-store');
}
