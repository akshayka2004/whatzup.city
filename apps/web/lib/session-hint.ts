/**
 * True when this browser may hold a session: the API's readable `has_session`
 * cookie (set beside the httpOnly tokens) or a cached user from before that
 * cookie existed. Visitors who never signed in skip /auth/me and /auth/refresh,
 * which would only ever answer 401.
 */
export function hasSessionHint(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (/(?:^|;\s*)has_session=1(?:;|$)/.test(document.cookie)) return true;
    return !!(localStorage.getItem('user_session') || localStorage.getItem('user'));
  } catch {
    return true; // storage blocked: fall back to asking the API
  }
}
