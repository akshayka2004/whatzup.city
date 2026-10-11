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
type AreaMessages = { en: Record<string, string>; ml: Record<string, string> };

/**
 * Add a page's messages by creating `messages/<area>.ts` exporting `{ en, ml }`
 * and listing it here. English is the source of truth: a key missing from `ml`
 * silently falls back to English, so a half-translated page never shows raw keys.
 */
const AREAS: AreaMessages[] = [common as unknown as AreaMessages, publicPages, publicMore];

export const MESSAGES: Record<Locale, Dict> = {
  en: Object.assign({}, ...AREAS.map((a) => a.en)),
  ml: Object.assign({}, ...AREAS.map((a) => a.ml)),
};

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
