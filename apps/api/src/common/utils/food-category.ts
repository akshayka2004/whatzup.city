// Keep in sync with apps/web/lib/food-category.ts.
const FOOD_CATEGORY_RE = /food|restaurant|cafe|bakery|buffet|catering|dining|kitchen|hotel/i;

export function isFoodCategory(category?: { slug?: string | null; name?: string | null } | null): boolean {
  if (!category) return false;
  return FOOD_CATEGORY_RE.test(category.slug || '') || FOOD_CATEGORY_RE.test(category.name || '');
}
