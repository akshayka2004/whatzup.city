'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY = 'recent_searches_v1';
const MAX = 6;

function read(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((s) => typeof s === 'string').slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function write(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* private mode / quota — recents are a nicety, never a blocker */
  }
}

/** Last few search terms, newest first, kept on this device only. */
export function useRecentSearches() {
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    setRecents(read());
  }, []);

  const add = useCallback((term: string) => {
    const t = term.trim();
    if (t.length < 2) return;
    const next = [t, ...read().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX);
    write(next);
    setRecents(next);
  }, []);

  const remove = useCallback((term: string) => {
    const next = read().filter((x) => x !== term);
    write(next);
    setRecents(next);
  }, []);

  const clear = useCallback(() => {
    write([]);
    setRecents([]);
  }, []);

  return { recents, add, remove, clear };
}
