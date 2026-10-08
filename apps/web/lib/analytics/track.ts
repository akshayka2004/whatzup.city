import { apiService } from '@/lib/services/api-service';
import { getVisitorId } from '@/lib/visitor-id';

const SESSION_KEY = 'analytics_session';
const SESSION_IDLE_MS = 30 * 60 * 1000;

/** Browser session id that rolls over after 30 minutes of inactivity (analytics "visit"). */
function getSessionId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const now = Date.now();
    const raw = sessionStorage.getItem(SESSION_KEY);
    const prev = raw ? (JSON.parse(raw) as { id: string; at: number }) : null;
    const id = prev && now - prev.at < SESSION_IDLE_MS ? prev.id : crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, at: now }));
    return id;
  } catch {
    return undefined;
  }
}

const PATH_SOURCES: [RegExp, string][] = [
  [/^\/$/, 'home'],
  [/^\/search/, 'search'],
  [/^\/category/, 'category'],
  [/^\/nearby/, 'nearby'],
  [/^\/offers/, 'offers'],
  [/^\/events/, 'events'],
  [/^\/favorites/, 'favorites'],
  [/^\/business\//, 'related'],
];

/** Where this page view came from, from the referrer (same-site path or external). */
export function inferSource(): string {
  if (typeof document === 'undefined' || !document.referrer) return 'direct';
  try {
    const ref = new URL(document.referrer);
    if (ref.origin !== window.location.origin) return 'external';
    return PATH_SOURCES.find(([re]) => re.test(ref.pathname))?.[1] ?? 'direct';
  } catch {
    return 'direct';
  }
}

/**
 * Fire-and-forget analytics event. Never blocks or throws. The server derives tenant,
 * device, bot flag and IP hash; the client only adds the anonymous visitor/session ids.
 */
export function track(
  event: string,
  opts: { businessId?: string; source?: string; metadata?: Record<string, unknown> } = {},
) {
  if (typeof window === 'undefined') return;
  let visitorId: string | undefined;
  try {
    visitorId = getVisitorId();
  } catch {
    visitorId = undefined;
  }
  apiService
    .post('/v1/analytics/track', {
      event,
      businessId: opts.businessId,
      source: opts.source,
      metadata: opts.metadata,
      visitorId,
      sessionId: getSessionId(),
    })
    .catch(() => {});
}
