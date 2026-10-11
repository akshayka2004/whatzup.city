// Production traffic reaches the API as Cloudflare → nginx → Next.js rewrite → API,
// so the socket peer is always 127.0.0.1. Rate limits and analytics need the real
// visitor, which only the proxies' headers carry. Those headers are trusted only
// when the peer is local (i.e. one of our own proxies); a direct remote caller is
// identified by its socket address and can't spoof its way into another bucket.

type HeaderBag = Record<string, string | string[] | undefined>;

export interface IpRequest {
  headers: HeaderBag;
  ip?: string;
  socket?: { remoteAddress?: string };
}

const LOOPBACK = /^(?:127\.|::1$|::ffff:127\.)/;

function header(headers: HeaderBag, name: string): string | undefined {
  const v = headers[name];
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
}

export function peerIp(req: IpRequest): string | undefined {
  return req.socket?.remoteAddress || req.ip || undefined;
}

export function isLocalPeer(req: IpRequest): boolean {
  const ip = peerIp(req);
  return !ip || LOOPBACK.test(ip);
}

/** IP named by our own proxies, or undefined when the request carries none. */
export function forwardedIp(req: IpRequest): string | undefined {
  const h = req.headers;
  return (
    header(h, 'cf-connecting-ip') ||
    header(h, 'x-real-ip') ||
    header(h, 'x-forwarded-for')?.split(',')[0]?.trim() ||
    undefined
  );
}

/** Best-known visitor IP: proxy headers from a local peer, else the socket address. */
export function clientIp(req: IpRequest): string | undefined {
  if (isLocalPeer(req)) return forwardedIp(req) || peerIp(req);
  return peerIp(req);
}
