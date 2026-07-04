import { NextRequest, NextResponse } from 'next/server';

/**
 * This app performs every mutation through the NestJS REST API (see
 * lib/services/api-service.ts) and ships ZERO React Server Actions — the build's
 * server-reference manifest is empty. Any request that still arrives carrying a
 * `Next-Action` header is therefore illegitimate: either a browser tab left open
 * from a deploy that predates the pinned server-actions encryption key, or a
 * scanner probing the Server Actions endpoint. Left alone, Next throws
 * "Failed to find Server Action \"…\"" and floods the PM2 logs.
 *
 * Short-circuit those requests with a 409 so the server never attempts the
 * (nonexistent) action lookup. A stale client simply needs to reload.
 */
export function middleware(req: NextRequest) {
  if (req.headers.has('next-action')) {
    return new NextResponse(
      'This deployment has no server actions. Please reload the page.',
      { status: 409, headers: { 'cache-control': 'no-store' } },
    );
  }
  return NextResponse.next();
}

export const config = {
  // Run on everything except Next's static assets and image optimizer.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
