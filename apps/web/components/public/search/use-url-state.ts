'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Keeps a piece of page state in sync with the query string — without a
 * navigation. State is seeded from the URL, changes are written back with
 * `history.replaceState` (Next.js syncs `useSearchParams` with it, so no
 * server round-trip or re-render storm), and an *external* URL change (e.g. the
 * header search sending you to `/search?q=…` while you're already here) is
 * pulled back into state.
 *
 * `apply` must only touch the params this page owns; everything else in the
 * URL (like category `type`) is preserved.
 *
 * Must be rendered under <Suspense> (it uses `useSearchParams`).
 */
export function useUrlState<T>({
  parse,
  apply,
}: {
  parse: (sp: URLSearchParams) => T;
  apply: (sp: URLSearchParams, value: T) => void;
}) {
  const searchParams = useSearchParams();
  const spString = searchParams.toString();

  // parse/apply are stable module-level functions in every caller, but keep
  // the latest in refs so the effects below never need them as dependencies.
  const parseRef = useRef(parse);
  const applyRef = useRef(apply);
  useEffect(() => {
    parseRef.current = parse;
    applyRef.current = apply;
  });

  const [value, setValue] = useState<T>(() => parse(new URLSearchParams(spString)));
  // Bumped whenever state was replaced because the URL changed from outside.
  const [externalVersion, setExternalVersion] = useState(0);
  // Strings we wrote whose echo (the router re-reading the URL) hasn't arrived
  // yet, plus the most recent one. Lets us tell our own echoes — even a stale
  // one arriving after a newer write — apart from a genuine external change.
  const latest = useRef(spString);
  const pending = useRef(new Set<string>());

  // URL changed by something other than us → adopt it.
  useEffect(() => {
    if (spString === latest.current) {
      pending.current.clear();
      return;
    }
    if (pending.current.delete(spString)) return;
    latest.current = spString;
    pending.current.clear();
    setValue(parseRef.current(new URLSearchParams(spString)));
    setExternalVersion((v) => v + 1);
  }, [spString]);

  // State changed → mirror it into the URL (only if that actually changes it).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    applyRef.current(sp, value);
    const next = sp.toString();
    if (next === window.location.search.replace(/^\?/, '')) return;
    latest.current = next;
    pending.current.add(next);
    window.history.replaceState(
      null,
      '',
      next ? `${window.location.pathname}?${next}` : window.location.pathname,
    );
  }, [value]);

  const update = useCallback((patch: Partial<T> | ((prev: T) => T)) => {
    setValue((prev) =>
      typeof patch === 'function' ? (patch as (p: T) => T)(prev) : { ...prev, ...patch },
    );
  }, []);

  return { value, update, externalVersion };
}
