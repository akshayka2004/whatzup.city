'use client';

import { Suspense, useState, useEffect } from 'react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { apiService } from '@/lib/services/api-service';
import { BusinessCard } from '@/components/business-card';
import { KERALA_CITIES, getViewerCity, setViewerCity } from '@/lib/constants';

function CategoryContent() {
  const searchParams = useSearchParams();
  const rawType = searchParams.get('type') || 'all';
  const categoryTitle =
    rawType === 'all' ? 'All Businesses' : rawType.charAt(0).toUpperCase() + rawType.slice(1);

  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');

  useEffect(() => { setCity(getViewerCity()); }, []);

  useEffect(() => {
    async function fetchBusinesses() {
      setLoading(true);
      try {
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

        const params = new URLSearchParams();
        if (categoryId) params.set('categoryId', categoryId);
        else if (rawType && rawType !== 'all') params.set('search', rawType);
        if (city) params.set('city', city);
        params.set('limit', '24');
        const bizRes = await apiService.get<any>(`/v1/businesses?${params.toString()}`);
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
  }, [rawType, city]);

  const handleCityChange = (v: string) => {
    const next = v === 'all' ? '' : v;
    setCity(next);
    setViewerCity(next);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">{categoryTitle}</h1>
          <p className="text-muted-foreground">Browse verified businesses in this category</p>
        </div>
        <Select value={city || 'all'} onValueChange={handleCityChange}>
          <SelectTrigger className="w-52 rounded-xl border-border">
            <SelectValue placeholder="Filter by city" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {KERALA_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : businesses.length === 0 ? (
        <Card className="p-12 rounded-2xl text-center border-dashed border-border bg-secondary/20">
          <p className="text-muted-foreground text-sm">No businesses found in this category{city ? ` in ${city}` : ''}.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {businesses.map((business: any) => (
            <BusinessCard key={business.id} business={business} />
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
