/**
 * Stable per-browser identifier for click dedupe on public endpoints
 * (offer click tracking). Not an auth concept — just spam resistance for
 * anonymous visitors. Logged-in users should use their own user id instead.
 */
const KEY = 'visitor_id';

export function getVisitorId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
