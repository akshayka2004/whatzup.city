import { NextRequest, NextResponse } from 'next/server';

/**
 * This app performs every mutation through the NestJS REST API (see
 * lib/services/api-service.ts) and ships ZERO React Server Actions — the build's
 * server-reference manifest is empty. Any request that still tries to invoke a
 * Server Action is therefore illegitimate: a browser tab left open from a deploy
 * that predates the pinned server-actions encryption key, or a scanner probing
 * the Server Actions endpoint. Left alone, Next throws
 * "Failed to find Server Action \"…\"" and floods the PM2 logs.
 *
 * A Server Action arrives one of two ways:
 *   - fetch invocation  → `Next-Action: <id>` request header (this is the "x")
 *   - no-JS form post   → multipart/form-data body with an $ACTION_… field
 * Short-circuit both with a 409 before Next attempts the (nonexistent) lookup.
 * /api/* is proxied to NestJS (and is where legit multipart uploads go), so it
 * is always let through. Everything else in this app posts JSON to /api, so no
 * legitimate traffic hits these guards.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Never touch the API proxy — legit JSON + multipart uploads live here.
  if (pathname.startsWith('/api/')) return NextResponse.next();

  if (req.method === 'POST') {
    const contentType = req.headers.get('content-type') || '';
    const looksLikeServerAction =
      req.headers.has('next-action') || contentType.includes('multipart/form-data');

    if (looksLikeServerAction) {
      return new NextResponse('This deployment has no server actions. Please reload the page.', {
        status: 409,
        headers: { 'cache-control': 'no-store', 'x-no-server-actions': '1' },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next's static assets and image optimizer.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
