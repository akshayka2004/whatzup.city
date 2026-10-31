/**
 * Where a notification should take the person: a same-site path from its metadata. Older notices
 * stored it as `href`, newer ones as `url`. Anything that is not a path on this site is ignored, so
 * a notice can never send someone to another website.
 */
export function notificationUrl(metadata: unknown): string | undefined {
  const m = (metadata ?? {}) as { url?: unknown; href?: unknown };
  for (const u of [m.url, m.href]) {
    if (typeof u === 'string' && /^\/(?!\/)[^\s]*$/.test(u)) return u;
  }
  return undefined;
}
