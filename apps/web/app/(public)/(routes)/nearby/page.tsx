'use client';

import { useState, useEffect } from 'react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { MapPin, Loader2 } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { apiService } from '@/lib/services/api-service';
import { BusinessCard } from '@/components/business-card';
import { KERALA_CITIES, getViewerCity, setViewerCity } from '@/lib/constants';

export default function NearbyPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');

  useEffect(() => { setCity(getViewerCity()); }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '18' });
    if (city) params.set('city', city);
    apiService
      .get<any>(`/v1/businesses?${params.toString()}`)
      .then((res) => {
        if (res.data && !res.error) {
          const list: any[] = Array.isArray(res.data)
            ? res.data
            : res.data?.data ?? res.data?.items ?? [];
          setBusinesses(list);
        } else {
          setBusinesses([]);
        }
      })
      .catch(() => setBusinesses([]))
      .finally(() => setLoading(false));
  }, [city]);

  const handleCityChange = (v: string) => {
    const next = v === 'all' ? '' : v;
    setCity(next);
    setViewerCity(next);
  };

  return (
    <PublicLayout>
      <div>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Nearby Businesses</h1>
            <p className="text-muted-foreground">Discover businesses around you</p>
          </div>
          <Select value={city || 'all'} onValueChange={handleCityChange}>
            <SelectTrigger className="w-52 rounded-xl border-border">
              <SelectValue placeholder="Choose city" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {KERALA_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Map Placeholder */}
        <Card className="mb-8 h-72 rounded-2xl bg-gradient-to-br from-secondary/60 to-secondary/20 border border-border flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--border)_60%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--border)_60%,transparent)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40"></div>
          <div className="relative z-10 text-center space-y-3 p-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto animate-pulse">
              <MapPin className="h-6 w-6" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
              Dormant for Next Release
            </span>
            <h3 className="text-lg font-bold text-foreground">Interactive Map View</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Real-time geolocation mapping is undergoing backend optimizations. Local listings are fully functional below.
            </p>
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : businesses.length === 0 ? (
          <Card className="p-12 rounded-2xl text-center border-dashed border-border bg-secondary/20">
            <p className="text-muted-foreground text-sm">No businesses found{city ? ` in ${city}` : ''}.</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {businesses.map((business: any) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
