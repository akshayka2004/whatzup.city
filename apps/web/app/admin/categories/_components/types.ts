export interface AdminCategory {
  id: string;
  name: string;
  nameMl?: string | null;
  slug: string;
  description?: string | null;
  icon?: string | null;
  parentId: string | null;
  template?: string | null;
  isActive: boolean;
  isSystem: boolean;
  showInSignup: boolean;
  sortOrder: number;
  listingsCount: number;
  childCount: number;
}

export interface CategoryImpact {
  businesses: number;
  asSubcategory: number;
  children: number;
  pendingVerification: number;
  launchOfferHolders: number;
  sample: { id: string; name: string }[];
}

export type CategoryAction = 'archive' | 'merge' | 'delete';

/** Same rule as the API (category-rules.ts slugify), used to suggest a slug while typing the name. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}
