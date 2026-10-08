'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '@/lib/services/api-service';

/**
 * Tiny stale-while-revalidate GET cache (a few hundred bytes, no dependency).
 *
 *  - Returns cached data instantly when the same endpoint was fetched recently,
 *    then quietly refreshes it in the background — back/forward and tab hops
 *    feel instant instead of showing a spinner every time.
 *  - Dedupes simultaneous requests for the same endpoint.
 *  - Optional `initialData` (from a server-rendered parent) seeds the cache so
 *    the first paint already has content and no request is made until stale.
 *  - Only for public / idempotent reads. Never cache user-specific mutations.
 */

interface Entry {
  data: unknown;
  at: number;
}

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<{ data: unknown; error: string | null }>>();
const MAX_ENTRIES = 80;

function remember(key: string, data: unknown) {
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(key, { data, at: Date.now() });
}

function load(key: string) {
  const running = inflight.get(key);
  if (running) return running;
  const p = apiService
    .get<unknown>(key)
    .then((res) => {
      if (!res.error) remember(key, res.data);
      return { data: res.data as unknown, error: res.error };
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

/** Warm the cache ahead of navigation (e.g. on hover/touchstart of a link). */
export function prefetchGet(key: string, ttlMs = 60_000) {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return;
  void load(key);
}

export function invalidateCachedGet(prefix?: string) {
  for (const k of [...store.keys()]) if (!prefix || k.startsWith(prefix)) store.delete(k);
}

export function useCachedGet<T = unknown>(
  key: string | null,
  options: { ttlMs?: number; initialData?: T | null; enabled?: boolean } = {},
) {
  const { ttlMs = 60_000, initialData = null, enabled = true } = options;
  const seeded = useRef(false);

  // Seed once, so a server-rendered parent's data counts as "fresh now".
  if (!seeded.current && key && initialData != null && !store.has(key)) {
    remember(key, initialData);
    seeded.current = true;
  }

  const [data, setData] = useState<T | null>(() => {
    if (!key) return initialData;
    return (store.get(key)?.data as T | undefined) ?? initialData;
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(() => !!key && enabled && !(store.get(key)?.data ?? initialData));
  const alive = useRef(true);

  const run = useCallback(
    async (force: boolean) => {
      if (!key || !enabled) return;
      const hit = store.get(key);
      if (hit) setData(hit.data as T);
      if (!force && hit && Date.now() - hit.at < ttlMs) {
        setLoading(false);
        return;
      }
      if (!hit) setLoading(true);
      const res = await load(key);
      if (!alive.current) return;
      if (res.error) setError(res.error);
      else {
        setError(null);
        setData(res.data as T);
      }
      setLoading(false);
    },
    [key, enabled, ttlMs],
  );

  useEffect(() => {
    alive.current = true;
    void run(false);
    return () => {
      alive.current = false;
    };
  }, [run]);

  const refresh = useCallback(() => run(true), [run]);

  return { data, error, loading, refresh };
}
