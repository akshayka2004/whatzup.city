'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { apiService } from '@/lib/services/api-service';

function CategoryContent() {
  const searchParams = useSearchParams();
  const rawType = searchParams.get('type') || 'all';
  const categoryTitle =
    rawType === 'all' ? 'All Businesses' : rawType.charAt(0).toUpperCase() + rawType.slice(1);

  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBusinesses() {
      setLoading(true);
      try {
        // Step 1: Try to resolve category ID from slug/name
        let categoryId: string | undefined;
        if (rawType && rawType !== 'all') {
          const catRes = await apiService.get<any>('/v1/categories');
          if (catRes.data && !catRes.error) {
            const cats: any[] = Array.isArray(catRes.data)
              ? catRes.data
              : catRes.data?.data ?? catRes.data?.items ?? [];
            const match = cats.find(
              (c: any) =>
                c.slug === rawType ||
                c.name?.toLowerCase() === rawType.toLowerCase() ||
                c.name?.toLowerCase().includes(rawType.toLowerCase()),
            );
            if (match) categoryId = match.id;
          }
        }

        // Step 2: Fetch businesses — filter by categoryId if resolved, else search by type name
        const params = new URLSearchParams();
        if (categoryId) {
          params.set('categoryId', categoryId);
        } else if (rawType && rawType !== 'all') {
          params.set('search', rawType);
        }
        params.set('limit', '24');
        const qs = params.toString();
        const bizRes = await apiService.get<any>(`/v1/businesses${qs ? '?' + qs : ''}`);
        if (bizRes.data && !bizRes.error) {
          const list: any[] = Array.isArray(bizRes.data)
            ? bizRes.data
            : bizRes.data?.data ?? bizRes.data?.items ?? [];
          setBusinesses(list);
        } else {
          setBusinesses([]);
        }
      } catch {
        setBusinesses([]);
      } finally {
        setLoading(false);
      }
    }
    fetchBusinesses();
  }, [rawType]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{categoryTitle}</h1>
      <p className="text-muted-foreground mb-8">Browse businesses in this category</p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : businesses.length === 0 ? (
        <Card className="p-12 rounded-2xl text-center border-dashed border-white/10 bg-white/5">
          <p className="text-muted-foreground text-sm">No businesses found in this category.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {businesses.map((business: any) => (
            <Card
              key={business.id}
              className="p-4 rounded-2xl overflow-hidden hover:shadow-md transition-shadow border-white/5 bg-card/40 backdrop-blur-xl"
            >
              <div className="w-full h-40 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl mb-4 border border-white/5 flex items-center justify-center">
                <span className="text-3xl font-extrabold text-white/10">
                  {(business.name || 'B').charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="font-semibold text-foreground mb-1 truncate">{business.name}</h3>
              <p className="text-xs text-muted-foreground mb-2 truncate">
                {business.category?.name || business.categoryName || ''}
              </p>
              <div className="flex items-center gap-2 text-sm mb-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">
                  {business.avgRating != null ? Number(business.avgRating).toFixed(1) : '—'}
                </span>
                <span className="text-muted-foreground">({business.reviewCount ?? 0})</span>
              </div>
              {business.city && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                  <MapPin className="h-4 w-4" />
                  {business.city}
                </div>
              )}
              <Link href={`/business/${business.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl border-white/10 text-slate-300 hover:bg-white/5 cursor-pointer"
                >
                  View Business
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoryPage() {
  return (
    <PublicLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <CategoryContent />
      </Suspense>
    </PublicLayout>
  );
}
