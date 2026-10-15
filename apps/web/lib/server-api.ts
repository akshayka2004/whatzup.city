/**
 * Server-side reads for public pages (Server Components / route handlers only —
 * it talks to the API process directly, not through the browser proxy).
 *
 * Contract: NEVER throws and returns null on any failure (timeout, 5xx, API
 * restarting during a deploy, build running with the API down). Callers pass
 * whatever they get to the existing client component as optional initial data;
 * when it is null that component simply fetches in the browser exactly like it
 * always did. So server-rendering can improve first paint but can't take a page
 * down.
 */

const API_BASE =
  process.env.API_URL ||
  (process.env.NODE_ENV === 'production' ? 'http://localhost:4001' : 'http://localhost:4000');

export async function serverGet<T = unknown>(
  path: string,
  opts: { revalidate?: number; tags?: string[]; timeoutMs?: number } = {},
): Promise<T | null> {
  const { revalidate = 120, tags, timeoutMs = 4000 } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/api${path}`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
      next: { revalidate, ...(tags ? { tags } : {}) },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * True only when the API answered 404 for this path: the record really doesn't
 * exist (or isn't public). Network errors, timeouts and 5xx return false, so a
 * blip never turns a real page into a 404. Shares the fetch cache with serverGet.
 */
export async function serverIsNotFound(
  path: string,
  opts: { revalidate?: number; timeoutMs?: number } = {},
): Promise<boolean> {
  const { revalidate = 120, timeoutMs = 4000 } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/api${path}`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
      next: { revalidate },
    });
    return res.status === 404;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** The API wraps lists inconsistently ({items}, {data}, bare array) — normalise like the client pages do. */
export function unwrapList<T = any>(body: unknown): T[] {
  const b = body as any;
  const list = b?.items ?? b?.data?.items ?? b?.data ?? b ?? [];
  return Array.isArray(list) ? list : [];
}

export function unwrapOne<T = any>(body: unknown): T | null {
  const b = body as any;
  return (b?.data ?? b ?? null) as T | null;
}

/** Public site origin for canonical URLs, sitemap and share cards. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://platform.whtzup.city'
).replace(/\/$/, '');
