'use client';

/**
 * Shared client-side favorites store (localStorage). Matches the key + event
 * used by the business detail page so the bookmark stays in sync everywhere.
 */
const FAVORITES_KEY = 'saved_businesses';
const EVENT = 'favoritesUpdated';

type FavBusiness = {
  id: string;
  name?: string;
  logo?: string | null;
  city?: string | null;
  category?: any;
  [k: string]: any;
};

function read(): FavBusiness[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getFavIds(): string[] {
  return read().map((b) => b.id);
}

export function isFavorite(id: string): boolean {
  return read().some((b) => b.id === id);
}

/** Toggle a business in favorites. Returns the new saved state. */
export function toggleFavorite(biz: FavBusiness): boolean {
  if (typeof window === 'undefined') return false;
  const existing = read();
  const idx = existing.findIndex((b) => b.id === biz.id);
  let saved: boolean;
  let next: FavBusiness[];
  if (idx >= 0) {
    next = existing.filter((b) => b.id !== biz.id);
    saved = false;
  } else {
    next = [
      {
        id: biz.id,
        name: biz.name,
        logo: biz.logo ?? null,
        city: biz.city ?? null,
        category: biz.category ?? null,
      },
      ...existing,
    ];
    saved = true;
  }
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore quota / disabled storage */
  }
  return saved;
}

export const FAVORITES_EVENT = EVENT;
