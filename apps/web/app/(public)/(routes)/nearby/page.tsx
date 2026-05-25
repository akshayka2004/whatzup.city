'use client';

import { useState, useEffect } from 'react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Star, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { apiService } from '@/lib/services/api-service';

export default function NearbyPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService
      .get<any>('/v1/businesses?limit=12')
      .then((res) => {
        if (res.data && !res.error) {
          const list: any[] = Array.isArray(res.data)
            ? res.data
            : res.data?.data ?? res.data?.items ?? [];
          setBusinesses(list);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <PublicLayout>
      <div>
        <h1 className="text-3xl font-bold mb-2">Nearby Businesses</h1>
        <p className="text-muted-foreground mb-8">Discover businesses around you</p>

        {/* Map Placeholder */}
        <Card className="mb-8 h-96 rounded-2xl bg-gradient-to-br from-zinc-900 to-black border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30"></div>
          <div className="absolute h-48 w-48 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 text-center space-y-3 p-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto animate-pulse">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                Dormant for Next Release
              </span>
            </div>
            <h3 className="text-lg font-bold text-foreground">Interactive Map View</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Real-time geolocation mapping is undergoing backend optimizations. Local listings are
              fully functional below.
            </p>
          </div>
        </Card>

        {/* Business List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : businesses.length === 0 ? (
          <Card className="p-12 rounded-2xl text-center border-dashed border-white/10 bg-white/5">
            <p className="text-muted-foreground text-sm">No businesses found.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {businesses.map((business: any) => (
              <Card key={business.id} className="p-6 rounded-2xl">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground text-lg truncate">
                      {business.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {business.category?.name || business.categoryName || ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">
                      {business.avgRating != null ? Number(business.avgRating).toFixed(1) : '—'}
                    </span>
                    <span className="text-muted-foreground">({business.reviewCount ?? 0})</span>
                  </div>
                  {business.city && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {business.city}
                    </div>
                  )}
                </div>

                <Link href={`/business/${business.id}`} className="w-full">
                  <Button className="w-full rounded-lg cursor-pointer" variant="outline" size="sm">
                    View Details
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
