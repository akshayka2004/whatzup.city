'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Star, MapPin, Globe, Instagram, Heart, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { apiService } from '@/lib/services/api-service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const FAVORITES_KEY = 'saved_businesses';

function toggleFav(business: any) {
  try {
    const existing: any[] = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    const idx = existing.findIndex((b: any) => b.id === business.id);
    const updated =
      idx >= 0
        ? existing.filter((b: any) => b.id !== business.id)
        : [
            {
              ...business,
              rating: String(business.rating ?? '—'),
              savedAt: new Date().toLocaleDateString(),
            },
            ...existing,
          ];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('favoritesUpdated'));
    return idx < 0;
  } catch {
    return false;
  }
}

function getFavIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]').map((b: any) => b.id);
  } catch {
    return [];
  }
}

interface SearchResult {
  id: string;
  name: string;
  category: string;
  rating: number | null;
  reviews: number;
  city: string;
  instagram?: string;
  website?: string;
  location: string;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('relevant');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [favIds, setFavIds] = useState<string[]>([]);

  const fetchResults = async (term: string, cat: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (term.trim()) params.set('search', term.trim());
    if (cat !== 'all') params.set('city', cat);
    const qs = params.toString();
    const res = await apiService.get<any>(`/v1/businesses${qs ? '?' + qs : ''}`);
    if (res.data && !res.error) {
      const list = Array.isArray(res.data) ? res.data : res.data?.data ?? res.data?.items ?? [];
      setResults(
        list.map((b: any) => ({
          id: b.id,
          name: b.name || '',
          category: b.category?.name || b.categoryName || 'General',
          rating: b.avgRating ?? b.rating ?? null,
          reviews: b.reviewCount ?? b.reviewsCount ?? 0,
          city: b.city || '',
          instagram: b.socialLinks?.instagram,
          website: b.website,
          location: [b.address, b.city, b.state].filter(Boolean).join(', '),
        })),
      );
    } else {
      setResults([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    setSearchTerm(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    fetchResults(searchTerm, categoryFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setFavIds(getFavIds());
    const handler = () => setFavIds(getFavIds());
    window.addEventListener('favoritesUpdated', handler);
    return () => window.removeEventListener('favoritesUpdated', handler);
  }, []);

  // Debounced re-fetch on search term change
  useEffect(() => {
    const t = setTimeout(() => fetchResults(searchTerm, categoryFilter), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, categoryFilter]);

  const handleToggleFav = (result: SearchResult) => {
    toggleFav(result);
    setFavIds(getFavIds());
  };

  const sorted = [...results].sort((a, b) => {
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'reviews') return b.reviews - a.reviews;
    return 0;
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">Search Businesses</h1>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, category, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 py-3 rounded-xl text-base border-white/10 bg-white/5"
          />
        </div>
        <div className="flex gap-4 flex-wrap">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40 rounded-xl border-white/10">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              <SelectItem value="Kochi">Kochi</SelectItem>
              <SelectItem value="Trivandrum">Trivandrum</SelectItem>
              <SelectItem value="Kozhikode">Kozhikode</SelectItem>
              <SelectItem value="Thrissur">Thrissur</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 rounded-xl border-white/10">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevant">Most Relevant</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="reviews">Most Reviewed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <Card className="p-12 rounded-2xl text-center border-dashed border-white/10 bg-white/5">
          <Search className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
          <h3 className="text-base font-semibold text-foreground mb-1">No businesses found</h3>
          <p className="text-sm text-muted-foreground">Try a different search term or city.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {sorted.map((result) => (
            <Card
              key={result.id}
              className="p-6 rounded-2xl hover:shadow-md transition-all border-white/5 bg-card/40 backdrop-blur-xl"
            >
              <div className="flex gap-6">
                <div className="w-32 h-32 rounded-xl bg-white/5 flex-shrink-0 border border-white/5"></div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{result.name}</h3>
                      <p className="text-sm text-muted-foreground">{result.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{result.rating != null ? result.rating.toFixed(1) : '—'}</span>
                      <span className="text-muted-foreground">({result.reviews})</span>
                    </div>
                    {result.city && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {result.city}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 flex-wrap">
                    {result.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-violet-400" />
                        {result.location}
                      </span>
                    )}
                    {result.instagram && (
                      <span className="flex items-center gap-1">
                        <Instagram className="h-3 w-3 text-pink-400" />
                        {result.instagram}
                      </span>
                    )}
                    {result.website && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3 text-cyan-400" />
                        {result.website}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/business/${result.id}`}>
                      <Button
                        variant="outline"
                        className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 cursor-pointer"
                        size="sm"
                      >
                        View Details
                      </Button>
                    </Link>
                    <Button
                      onClick={() => handleToggleFav(result)}
                      variant="outline"
                      size="sm"
                      className={`rounded-xl cursor-pointer ${
                        favIds.includes(result.id)
                          ? 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                          : 'border-white/10 text-slate-400 hover:bg-white/5'
                      }`}
                      title={favIds.includes(result.id) ? 'Remove from favorites' : 'Save to favorites'}
                    >
                      <Heart className={`h-4 w-4 ${favIds.includes(result.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <PublicLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <SearchContent />
      </Suspense>
    </PublicLayout>
  );
}
