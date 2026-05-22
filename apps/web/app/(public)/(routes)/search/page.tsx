'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, SlidersHorizontal, Star, MapPin, Globe, Instagram, Heart } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

const FAVORITES_KEY = 'saved_businesses';
function toggleFav(business: { id: number; name: string; category: string; rating: number; reviews: number }) {
  try {
    const existing: any[] = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    const idx = existing.findIndex((b: any) => b.id === business.id);
    const updated = idx >= 0
      ? existing.filter((b: any) => b.id !== business.id)
      : [{ ...business, rating: business.rating.toString(), savedAt: new Date().toLocaleDateString() }, ...existing];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('favoritesUpdated'));
    return idx < 0;
  } catch { return false; }
}
function getFavIds(): number[] {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]').map((b: any) => b.id); }
  catch { return []; }
}
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const mockResults = [
  {
    id: 1,
    name: 'Bella Restaurant',
    category: 'Restaurants',
    rating: 4.8,
    reviews: 234,
    distance: '0.5 km',
    verified: true,
    instagram: '@bella_eats',
    website: 'bellarestaurant.com',
    location: '12 Main St, Downtown',
  },
  {
    id: 2,
    name: 'Tech Solutions',
    category: 'Services',
    rating: 4.6,
    reviews: 156,
    distance: '1.2 km',
    verified: true,
    instagram: '@techsol_official',
    website: 'techsolutions.co',
    location: '456 Airport Ave',
  },
  {
    id: 3,
    name: 'Fashion Hub',
    category: 'Shopping',
    rating: 4.5,
    reviews: 89,
    distance: '0.8 km',
    verified: true,
    instagram: '@fashionhub',
    website: 'fashionhub.store',
    location: '789 Mall Rd',
  },
  {
    id: 4,
    name: 'Health Plus Clinic',
    category: 'Healthcare',
    rating: 4.9,
    reviews: 342,
    distance: '1.5 km',
    verified: true,
    instagram: '@healthplus',
    website: 'healthplus.clinic',
    location: '321 Wellness Ave',
  },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('relevant');
  const [favIds, setFavIds] = useState<number[]>([]);

  useEffect(() => {
    setSearchTerm(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setFavIds(getFavIds());
    const handler = () => setFavIds(getFavIds());
    window.addEventListener('favoritesUpdated', handler);
    return () => window.removeEventListener('favoritesUpdated', handler);
  }, []);

  const handleToggleFav = (result: (typeof mockResults)[0]) => {
    toggleFav(result);
    setFavIds(getFavIds());
  };

  const filtered = mockResults
    .filter((r) => {
      if (categoryFilter !== 'all' && r.category.toLowerCase() !== categoryFilter) return false;
      if (searchTerm && !r.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'distance') return parseFloat(a.distance) - parseFloat(b.distance);
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
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="restaurants">Restaurants</SelectItem>
              <SelectItem value="services">Services</SelectItem>
              <SelectItem value="shopping">Shopping</SelectItem>
              <SelectItem value="healthcare">Healthcare</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 rounded-xl border-white/10">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevant">Most Relevant</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="distance">Nearest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((result) => (
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
                  {result.verified && (
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs rounded-full font-semibold">
                      Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{result.rating}</span>
                    <span className="text-muted-foreground">({result.reviews})</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {result.distance}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-violet-400" />
                    {result.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Instagram className="h-3 w-3 text-pink-400" />
                    {result.instagram}
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3 text-cyan-400" />
                    {result.website}
                  </span>
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
                    className={`rounded-xl cursor-pointer ${favIds.includes(result.id) ? 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
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
    </div>
  );
}

export default function SearchPage() {
  return (
    <PublicLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        }
      >
        <SearchContent />
      </Suspense>
    </PublicLayout>
  );
}
