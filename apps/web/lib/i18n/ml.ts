import { commonMl } from './messages/common.ml';
import { publicPagesMl } from './messages/public.ml';
import { publicMoreMl } from './messages/public-more.ml';

/** Every Malayalam string, merged. Imported only through loadLocale('ml'). */
export const ML: Record<string, string> = Object.assign({}, commonMl, publicPagesMl, publicMoreMl);
