'use client';

import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Star } from 'lucide-react';

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
        <Card className="mb-8 h-96 rounded-2xl bg-secondary flex items-center justify-center">
          <p className="text-muted-foreground">Map View Placeholder</p>
        </Card>

        {/* Business List */}
        <div className="grid md:grid-cols-2 gap-6">
          {nearbyBusinesses.map((business) => (
            <Card key={business.id} className="p-6 rounded-2xl">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">{business.name}</h3>
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

              <Button className="w-full rounded-lg" variant="outline" size="sm">
                View Details
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
