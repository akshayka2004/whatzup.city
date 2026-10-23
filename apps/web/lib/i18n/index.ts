import { common } from './messages/common';
import { publicPages } from './messages/public';
import { publicMore } from './messages/public-more';

export type Locale = 'en' | 'ml';

export const LOCALES: { code: Locale; native: string; english: string }[] = [
  { code: 'en', native: 'English', english: 'English' },
  { code: 'ml', native: 'മലയാളം', english: 'Malayalam' },
];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_STORAGE_KEY = 'viewer_locale';

type Dict = Record<string, string>;
type AreaMessages = { en: Record<string, string> };

/**
 * Add a page's messages by creating `messages/<area>.ts` exporting `{ en }` plus
 * `messages/<area>.ml.ts` (merged in ./ml.ts), and listing the English file here.
 * English is the source of truth: a key missing from Malayalam silently falls back
 * to English, so a half-translated page never shows raw keys.
 */
const AREAS: AreaMessages[] = [common as unknown as AreaMessages, publicPages, publicMore];

/** Malayalam starts empty and is filled by loadLocale('ml'), so English visitors never download it. */
export const MESSAGES: Record<Locale, Dict> = {
  en: Object.assign({}, ...AREAS.map((a) => a.en)),
  ml: {},
};

let mlLoad: Promise<void> | null = null;

/** Resolves once `locale`'s strings are in MESSAGES (immediately for English). */
export function loadLocale(locale: Locale): Promise<void> {
  if (locale !== 'ml') return Promise.resolve();
  mlLoad ??= import('./ml').then((m) => {
    Object.assign(MESSAGES.ml, m.ML);
  });
  return mlLoad;
}

export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  let out = MESSAGES[locale]?.[key] ?? MESSAGES.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
  }
  return out;
}
