import { BadRequestException } from '@nestjs/common';
import { isTemplateKey } from '@saas/types';

/**
 * Icons a category may use: lucide-react component names the UI maps (home row, search, admin picker).
 * Anything else would render as the generic icon, so the API refuses it instead of storing a typo.
 */
export const CATEGORY_ICONS = [
  'UtensilsCrossed',
  'ChefHat',
  'Coffee',
  'Cake',
  'Pizza',
  'Wine',
  'ShoppingBag',
  'ShoppingCart',
  'Store',
  'Shirt',
  'Gem',
  'Gift',
  'Hotel',
  'BedDouble',
  'Home',
  'Building2',
  'Landmark',
  'Stethoscope',
  'HeartPulse',
  'Heart',
  'Pill',
  'Dumbbell',
  'Sparkles',
  'Scissors',
  'GraduationCap',
  'BookOpen',
  'Wrench',
  'Car',
  'Bike',
  'Cpu',
  'Laptop',
  'Smartphone',
  'Music',
  'Film',
  'Ticket',
  'PartyPopper',
  'Camera',
  'Plane',
  'Briefcase',
  'Scale',
  'Banknote',
  'Shield',
  'Baby',
  'PawPrint',
  'Flower2',
  'Leaf',
  'Truck',
  'Hammer',
  'Paintbrush',
  'Tag',
  'Shapes',
] as const;

export const SLUG_RE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
export const MAX_DEPTH = 2;

/** "Fast-food Chains" → "fast_food_chains" */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

export function assertSlug(slug: string) {
  if (slug.length < 2 || slug.length > 60 || !SLUG_RE.test(slug)) {
    throw new BadRequestException(
      'The slug must be 2–60 characters: lowercase letters and numbers, words joined by underscores.',
    );
  }
}

export function assertIcon(icon?: string | null) {
  if (icon == null || icon === '') return;
  if (!(CATEGORY_ICONS as readonly string[]).includes(icon)) {
    throw new BadRequestException('Choose an icon from the list.');
  }
}

export function assertTemplate(template?: string | null) {
  if (template == null || template === '') return;
  if (!isTemplateKey(template)) {
    throw new BadRequestException('Unknown category template.');
  }
}

export function normName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

/** Two categories under one parent can't share a name (case-insensitive). */
export function sameName(a: string, b: string) {
  return normName(a).toLowerCase() === normName(b).toLowerCase();
}

export interface CatLike {
  id: string;
  parentId: string | null;
}

/**
 * A parent must be a top-level category (depth is capped at two levels), not the category itself,
 * and a category that already has children can't itself become a child.
 */
export function assertParent(
  self: { id?: string; hasChildren?: boolean } | null,
  parent: CatLike | null,
) {
  if (!parent) return;
  if (self?.id && parent.id === self.id) {
    throw new BadRequestException('A category cannot be its own parent.');
  }
  if (parent.parentId) {
    throw new BadRequestException(
      `Categories can only be ${MAX_DEPTH} levels deep: pick a top-level category as the parent.`,
    );
  }
  if (self?.hasChildren) {
    throw new BadRequestException(
      'This category has subcategories, so it cannot be moved under another category.',
    );
  }
}
