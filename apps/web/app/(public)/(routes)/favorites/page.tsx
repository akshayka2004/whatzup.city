'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Trash2, Star, X, AlertTriangle, Search, CheckCircle2 } from 'lucide-react';

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

export function getSavedBusinesses(): SavedBusiness[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
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

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<SavedBusiness[]>([]);
  const [removingFav, setRemovingFav] = useState<SavedBusiness | null>(null);

  const reload = () => setFavorites(getSavedBusinesses());

  useEffect(() => {
    reload();
    window.addEventListener('favoritesUpdated', reload);
    return () => window.removeEventListener('favoritesUpdated', reload);
  }, []);

  const handleRemove = () => {
    if (!removingFav) return;
    const updated = getSavedBusinesses().filter((b) => b.id !== removingFav.id);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('favoritesUpdated'));
    setRemovingFav(null);
  };

  return (
    <PublicLayout>
      <div>
        <h1 className="text-3xl font-bold mb-2">Saved Businesses</h1>
        <p className="text-muted-foreground mb-8">
          Your collection of favorite businesses and services
        </p>

        {favorites.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {favorites.map((fav) => (
              <Card
                key={fav.id}
                className="p-6 rounded-2xl hover:shadow-md transition-all border-white/5 bg-card/40 backdrop-blur-xl"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <h3 className="font-semibold text-foreground text-lg truncate">{fav.name}</h3>
                      {fav.isVerified && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                          <CheckCircle2 className="h-3 w-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{fav.category}</p>
                    {fav.savedAt && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">Saved {fav.savedAt}</p>
                    )}
                  </div>
                  <Heart className="h-5 w-5 fill-red-500 text-red-500 shrink-0" />
                </div>
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{fav.rating}</span>
                    <span className="text-muted-foreground">({fav.reviews})</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/business/${fav.id}`} className="flex-1">
                    <Button
                      className="w-full rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer"
                      size="sm"
                    >
                      Visit
                    </Button>
                  </Link>
                  <Button
                    onClick={() => setRemovingFav(fav)}
                    size="sm"
                    variant="outline"
                    className="rounded-xl border-rose-500/20 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 rounded-2xl text-center border-dashed border-white/10 bg-white/5">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Saved Businesses Yet</h3>
            <p className="text-muted-foreground mb-6 text-sm">
              Browse businesses and tap the heart icon to save them here
            </p>
            <Link href="/search">
              <Button className="rounded-xl gap-2 cursor-pointer">
                <Search className="h-4 w-4" />
                Browse Businesses
              </Button>
            </Link>
          </Card>
        )}

        {removingFav && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative text-center">
              <button
                onClick={() => setRemovingFav(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Remove from Favorites</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Remove{' '}
                <span className="font-semibold text-foreground">"{removingFav.name}"</span>{' '}
                from your saved businesses?
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => setRemovingFav(null)}
                  variant="outline"
                  className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 px-4 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRemove}
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4 cursor-pointer"
                >
                  Remove
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
