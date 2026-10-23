/**
 * Public, identical-for-everyone reads. Browsers revalidate every time; Cloudflare
 * (with the /api cache rule in docs/ops-edge-and-origin.md) and other shared caches
 * may serve them for a minute and keep serving stale while refreshing.
 */
export const PUBLIC_API_CACHE = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';
