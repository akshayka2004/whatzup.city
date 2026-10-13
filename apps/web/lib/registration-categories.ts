// ============================================================
// Registration category list
//
// Built from the live master list (GET /v1/categories) so a category a super
// admin adds appears on the registration form and an archived one disappears.
// The hard-coded list in app/register/_wizard/shared.tsx is only the offline
// fallback and the source of subcategory labels for categories whose
// subcategories were never created in the database.
// ============================================================

export interface ApiCategoryNode {
  id?: string;
  slug: string;
  name: string;
  nameMl?: string | null;
  icon?: string | null;
  template?: string | null;
  isActive?: boolean;
  showInSignup?: boolean;
  listingsCount?: number;
  children?: ApiCategoryNode[];
}

export interface RegistrationSub {
  slug: string;
  label: string;
}

export interface RegistrationCategory {
  slug: string;
  label: string;
  template?: string | null;
  subcategories: RegistrationSub[];
}

const visible = (c: ApiCategoryNode) => c.isActive !== false && c.showInSignup !== false;

export function buildRegistrationCategories(
  tree: ApiCategoryNode[] | null | undefined,
  fallback: RegistrationCategory[],
  locale: 'en' | 'ml' = 'en',
): RegistrationCategory[] {
  if (!tree || tree.length === 0) return fallback;
  const labelOf = (c: ApiCategoryNode) => (locale === 'ml' && c.nameMl ? c.nameMl : c.name);
  const legacy = new Map(fallback.map((c) => [c.slug, c.subcategories]));

  const out: RegistrationCategory[] = [];
  for (const root of tree) {
    if (!visible(root)) continue;
    const kids = (root.children ?? [])
      .filter(visible)
      .map((k) => ({ slug: k.slug, label: labelOf(k) }));
    out.push({
      slug: root.slug,
      label: labelOf(root),
      template: root.template ?? null,
      // Subcategories that were never created in the database keep their old labels.
      subcategories: kids.length > 0 ? kids : (legacy.get(root.slug) ?? []),
    });
  }
  return out.length > 0 ? out : fallback;
}
