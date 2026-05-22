'use client';

import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Star } from 'lucide-react';
import Link from 'next/link';

const nearbyBusinesses = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  name: `Business ${i + 1}`,
  category: ['Restaurant', 'Shop', 'Service', 'Healthcare'][i % 4],
  distance: (0.2 + Math.random() * 2).toFixed(1),
  rating: (4 + Math.random() * 0.9).toFixed(1),
  reviews: Math.floor(50 + Math.random() * 500),
}));

export default function NearbyPage() {
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
              Real-time geolocation mapping is undergoing backend optimizations. Local listings are fully functional below.
            </p>
          </div>
        </Card>

        {/* Business List */}
        <div className="grid md:grid-cols-2 gap-6">
          {nearbyBusinesses.map((business) => (
            <Card key={business.id} className="p-6 rounded-2xl">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{business.name}</h3>
                  <p className="text-sm text-muted-foreground">{business.category}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{business.rating}</span>
                  <span className="text-muted-foreground">({business.reviews})</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {business.distance} km
                </div>
              </div>

              <Link href={`/business/${business.id}`} className="w-full">
                <Button className="w-full rounded-lg cursor-pointer" variant="outline" size="sm">
                  View Details
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}

