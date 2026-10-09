'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Heart, Trash2, Star, CheckCircle2 } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { StaggerGrid } from '@/components/public/offers/stagger-grid';
import { SavedGridSkeleton } from '@/components/public/offers/skeletons';
import { cn } from '@/lib/utils';

export interface SavedBusiness {
  id: string | number;
  name: string;
  category: string;
  rating: string;
  reviews: number;
  savedAt: string;
  isVerified?: boolean;
}

export const FAVORITES_KEY = 'saved_businesses';

/** Saved entries come from two writers over time; normalise so old rows (category object, no rating) render. */
function normalise(raw: any): SavedBusiness {
  const cat = raw?.category;
  return {
    id: raw?.id,
    name: String(raw?.name ?? 'Saved business'),
    category: typeof cat === 'string' ? cat : (cat?.name ?? ''),
    rating: raw?.rating != null && raw.rating !== '' ? String(raw.rating) : '',
    reviews: Number(raw?.reviews ?? 0) || 0,
    savedAt: String(raw?.savedAt ?? ''),
    isVerified: !!raw?.isVerified,
  };
}

export function getSavedBusinesses(): SavedBusiness[] {
  if (typeof window === 'undefined') return [];
  try {
    const list = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return Array.isArray(list) ? list.filter((b) => b?.id).map(normalise) : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(business: SavedBusiness): boolean {
  const existing = getSavedBusinesses();
  const idx = existing.findIndex((b) => b.id === business.id);
  let updated: SavedBusiness[];
  let isSaved: boolean;
  if (idx >= 0) {
    updated = existing.filter((b) => b.id !== business.id);
    isSaved = false;
  } else {
    updated = [{ ...business, savedAt: new Date().toLocaleDateString() }, ...existing];
    isSaved = true;
  }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('favoritesUpdated'));
  return isSaved;
}

export function isFavorited(id: number): boolean {
  return getSavedBusinesses().some((b) => b.id === id);
}

const UNDO_MS = 5000;
const EXIT_MS = 200;

/** "Removed · Undo" bar. Mounted fresh per removal (keyed), so its 5s drain always starts from full. */
function UndoBar({ name, onUndo }: { name: string; onUndo: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setArmed(true), 30);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div
      role="status"
      className="ui-pop fixed inset-x-4 bottom-24 z-[60] mx-auto flex max-w-md items-center gap-2 overflow-hidden rounded-2xl border border-border bg-card py-1 pl-4 pr-1 shadow-2xl md:bottom-6"
    >
      <p className="min-w-0 flex-1 truncate text-sm text-foreground">
        Removed <span className="font-semibold">“{name}”</span>
      </p>
      <button
        type="button"
        onClick={onUndo}
        className="ui-press min-h-11 cursor-pointer rounded-xl px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
      >
        Undo
      </button>
      <span
        aria-hidden
        className={cn(
          'absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary transition-transform duration-[5000ms] ease-linear',
          armed ? 'scale-x-0' : 'scale-x-100',
        )}
      />
    </div>
  );
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<SavedBusiness[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [leaving, setLeaving] = useState<Array<string | number>>([]);
  const [undo, setUndo] = useState<{ fav: SavedBusiness; index: number; token: number } | null>(null);
  const undoTimer = useRef<number | null>(null);

  const reload = () => setFavorites(getSavedBusinesses());

  useEffect(() => {
    reload();
    setLoaded(true);
    window.addEventListener('favoritesUpdated', reload);
    return () => {
      window.removeEventListener('favoritesUpdated', reload);
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
    };
  }, []);

  const dismissUndo = () => {
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    undoTimer.current = null;
    setUndo(null);
  };

  // Saved businesses live in this browser's localStorage (there is no server call),
  // so removal stays immediate and exactly as before: the card fades out, then the
  // entry is dropped and `favoritesUpdated` fires. Undo simply puts it back.
  const handleRemove = (fav: SavedBusiness) => {
    if (leaving.includes(fav.id)) return;
    const index = Math.max(0, favorites.findIndex((b) => b.id === fav.id));
    setLeaving((l) => [...l, fav.id]);
    window.setTimeout(() => {
      const updated = getSavedBusinesses().filter((b) => b.id !== fav.id);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('favoritesUpdated'));
      setLeaving((l) => l.filter((id) => id !== fav.id));
      setUndo({ fav, index, token: Date.now() });
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
      undoTimer.current = window.setTimeout(() => {
        undoTimer.current = null;
        setUndo(null);
      }, UNDO_MS);
    }, EXIT_MS);
  };

  const handleUndo = () => {
    if (!undo) return;
    const current = getSavedBusinesses();
    if (!current.some((b) => b.id === undo.fav.id)) {
      const next = [...current];
      next.splice(Math.min(undo.index, next.length), 0, undo.fav);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event('favoritesUpdated'));
    }
    dismissUndo();
  };

  return (
    <PublicLayout>
      <div>
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h1 className="mb-1 text-2xl font-bold tracking-tight sm:text-3xl">Saved Businesses</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Your collection of favorite businesses and services
            </p>
          </div>
          {loaded && favorites.length > 0 && (
            <span
              // key restarts the pop whenever the count changes
              key={favorites.length}
              className="ui-pop inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-brand-soft px-3 py-1.5 text-sm font-semibold tabular-nums text-brand-soft-foreground"
            >
              <Heart className="h-4 w-4 fill-current" />
              {favorites.length} saved
            </span>
          )}
        </div>

        {!loaded ? (
          <SavedGridSkeleton />
        ) : favorites.length > 0 ? (
          <StaggerGrid className="grid grid-cols-1 md:grid-cols-2" gap={5}>
            {favorites.map((fav) => (
              // Wrapper = stagger target + off-screen skipping; the card inside owns the exit transition.
              <div key={fav.id} className="ui-cv-auto">
                <div
                  className={cn(
                    'flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-[opacity,transform,border-color] duration-200 ease-out hover:border-primary/30',
                    leaving.includes(fav.id) && 'pointer-events-none scale-95 opacity-0',
                  )}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <h3 className="truncate text-lg font-semibold text-foreground">{fav.name}</h3>
                        {fav.isVerified && (
                          <span className="inline-flex items-center gap-0.5 rounded-full border border-success/25 bg-success-soft px-1.5 py-0.5 text-xs font-semibold text-success-soft-foreground">
                            <CheckCircle2 className="h-3 w-3" />
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{fav.category}</p>
                      {fav.savedAt && (
                        <p className="mt-0.5 text-xs text-muted-foreground">Saved {fav.savedAt}</p>
                      )}
                    </div>
                    <Heart className="h-5 w-5 shrink-0 fill-destructive text-destructive" />
                  </div>
                  {fav.rating && Number(fav.rating) > 0 ? (
                    <div className="mb-4 flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-warning text-warning" />
                      <span className="font-medium">{fav.rating}</span>
                      {fav.reviews > 0 && <span className="text-muted-foreground">({fav.reviews})</span>}
                    </div>
                  ) : (
                    <div className="mb-4" />
                  )}
                  <div className="mt-auto flex gap-2">
                    <Link
                      href={`/business/${fav.id}`}
                      className="ui-press inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-accent text-sm font-semibold text-primary-foreground"
                    >
                      Visit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemove(fav)}
                      aria-label={`Remove ${fav.name} from saved`}
                      className="ui-press inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-destructive/25 text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </StaggerGrid>
        ) : (
          <EmptyState
            icon={Heart}
            title="No Saved Businesses Yet"
            description="Browse businesses and tap the heart icon to save them here"
            action={{ label: 'Browse Businesses', href: '/search' }}
          />
        )}

        {undo && <UndoBar key={undo.token} name={undo.fav.name} onUndo={handleUndo} />}
      </div>
    </PublicLayout>
  );
}
