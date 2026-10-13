/**
 * Category-specific "Status" attributes shown during business registration and in settings.
 *
 * The attribute sets live in @saas/types as category TEMPLATES, so a category a super admin
 * creates just picks a template. A category's own template wins, then its parent's, then the
 * built-in slug map, then the General business set.
 *
 * type 'single'  → one choice (radio / select)
 * type 'boolean' → Yes/No toggle
 * type 'multi'   → many choices (checkbox group)
 */
import { resolveTemplate, type AttrType, type CategoryAttribute } from '@saas/types';

export type { AttrType, CategoryAttribute };

export function getCategoryAttributes(
  categorySlug?: string | null,
  template?: string | null,
): CategoryAttribute[] {
  return resolveTemplate({ slug: categorySlug ?? '', template: template ?? null }).attributes;
}
