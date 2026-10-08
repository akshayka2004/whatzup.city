'use client';

import { useEffect, useRef, useState } from 'react';

/** Warns before the tab is closed/reloaded while a form has unsaved edits. */
export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
}

/**
 * Tracks whether `value` differs from the last saved snapshot.
 *   const { dirty, markSaved, reset } = useDirty(form);
 * Call markSaved() after a successful save and (optionally) reset() to get the snapshot back.
 */
export function useDirty<T>(value: T) {
  const snapshot = useRef<string | null>(null);
  const [, force] = useState(0);
  const serialised = JSON.stringify(value);

  // First render with real data becomes the baseline.
  if (snapshot.current === null) snapshot.current = serialised;

  return {
    dirty: snapshot.current !== serialised,
    /** Treat the current value as saved (also use this once async data has loaded to set the baseline). */
    markSaved: () => {
      snapshot.current = JSON.stringify(value);
      force((n) => n + 1);
    },
    /** The last saved value, or null before the baseline exists. */
    saved: (): T | null => (snapshot.current ? (JSON.parse(snapshot.current) as T) : null),
  };
}

/**
 * Autosaves a draft of `value` to localStorage (debounced) and restores it on mount.
 * Meant for long "create" forms so an accidental refresh or lost connection doesn't cost the user
 * their typing. Never throws: storage can be blocked (private mode, quota).
 *
 *   const { restored, clear } = useDraft('offer-create', form, setForm);
 */
export function useDraft<T>(key: string, value: T, apply: (draft: T) => void, opts: { enabled?: boolean; delayMs?: number } = {}) {
  const { enabled = true, delayMs = 600 } = opts;
  const [restored, setRestored] = useState(false);
  const applied = useRef(false);

  useEffect(() => {
    if (!enabled || applied.current) return;
    applied.current = true;
    try {
      const raw = localStorage.getItem(`draft:${key}`);
      if (raw) {
        apply(JSON.parse(raw) as T);
        setRestored(true);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key]);

  useEffect(() => {
    if (!enabled || !applied.current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(`draft:${key}`, JSON.stringify(value));
      } catch {
        /* ignore */
      }
    }, delayMs);
    return () => clearTimeout(t);
  }, [enabled, key, value, delayMs]);

  const clear = () => {
    try {
      localStorage.removeItem(`draft:${key}`);
    } catch {
      /* ignore */
    }
    setRestored(false);
  };

  return { restored, clear };
}
