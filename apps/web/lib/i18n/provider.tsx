'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, loadLocale, translate, type Locale } from './index';
import { LABEL_KEYS } from './labels';

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Translate a nav label already written in English (see labels.ts); unknown labels pass through. */
  tl: (label: string) => string;
}

const I18nContext = createContext<I18nValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key, vars) => translate(DEFAULT_LOCALE, key, vars),
  tl: (label) => label,
});

/**
 * Client-side language switch (English / Malayalam). Pages are server-rendered in
 * English; the saved choice is applied right after hydration. It deliberately does
 * NOT read cookies on the server, because that would make every route dynamic and
 * defeat page caching.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (saved === 'ml' || saved === 'en') setLocaleState(saved);
    } catch {
      /* private mode: stay on English */
    }
  }, []);

  // The language whose strings are loaded. Switching to Malayalam keeps English on
  // screen for the moment it takes to fetch that catalogue.
  const [active, setActive] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    let alive = true;
    loadLocale(locale)
      .then(() => {
        if (alive) setActive(locale);
      })
      .catch(() => {
        /* offline: stay on the language already shown */
      });
    return () => {
      alive = false;
    };
  }, [locale]);

  useEffect(() => {
    document.documentElement.lang = active;
  }, [active]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(active, key, vars),
      tl: (label) => (LABEL_KEYS[label] ? translate(active, LABEL_KEYS[label]) : label),
    }),
    [locale, active, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
/** `const t = useT(); t('nav.home')` */
export const useT = () => useContext(I18nContext).t;
