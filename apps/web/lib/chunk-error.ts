/**
 * A deploy replaces the JS chunks, so a tab opened before it can ask for files
 * that no longer exist. Those errors only clear with a full reload, which
 * fetches the new build — retrying the segment just fails again.
 */
const CHUNK_RE =
  /ChunkLoadError|Loading (?:CSS )?chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

export function isChunkError(error: unknown): boolean {
  const e = error as { name?: string; message?: string } | null;
  return !!e && CHUNK_RE.test(`${e.name ?? ''} ${e.message ?? ''}`);
}

const KEY = 'chunk-reload-at';

/** Reload once per minute at most, so a genuinely broken build can't loop. Returns true if reloading. */
export function reloadForChunkError(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // Storage blocked: still reload; worst case the user sees the error page after.
  }
  window.location.reload();
  return true;
}
