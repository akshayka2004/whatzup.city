'use client';

import { useEffect, useState } from 'react';
import { apiService } from '@/lib/services/api-service';

/**
 * One public GET feed for the landing page.
 *
 *  - `initial` is the body the server already fetched for `basePath`. When it is
 *    present and `path === basePath` no request is made (the page is already
 *    painted with it).
 *  - When `initial` is null/undefined (server fetch failed) or `path` differs
 *    (e.g. the viewer picked a city), it fetches in the browser exactly like the
 *    page always did.
 *  - A failed refetch keeps whatever was already on screen.
 *
 * Deliberately not useCachedGet: its module-level store would be shared across
 * server renders and pin the first server-rendered HTML for the process lifetime.
 */
export function useFeed(path: string, basePath: string, initial?: unknown) {
  const [body, setBody] = useState<unknown>(initial ?? null);
  const [loading, setLoading] = useState(initial == null);

  useEffect(() => {
    if (path === basePath && initial != null) {
      setBody(initial);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    apiService
      .get<unknown>(path)
      .then((res) => {
        if (!alive) return;
        if (!res.error && res.data != null) setBody(res.data);
        setLoading(false);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // `initial` is a one-shot seed from the server component; it never changes after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, basePath]);

  return { body, loading };
}
