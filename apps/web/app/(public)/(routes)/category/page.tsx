'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, MapPin } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

const businesses = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: `Business ${i + 1}`,
  rating: 4.5 + Math.random() * 0.5,
  reviews: Math.floor(50 + Math.random() * 400),
  distance: `${(0.5 + Math.random() * 2).toFixed(1)} km`,
}));

function CategoryContent() {
  const searchParams = useSearchParams();
  const rawType = searchParams.get('type') || 'Restaurants';
  // Capitalize first letter beautifully
  const categoryTitle = rawType.charAt(0).toUpperCase() + rawType.slice(1);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{categoryTitle}</h1>
      <p className="text-muted-foreground mb-8">Browse businesses in this category</p>

      <div className="grid md:grid-cols-3 gap-6">
        {businesses.map((business) => (
          <Card
            key={business.id}
            className="p-4 rounded-2xl overflow-hidden hover:shadow-md transition-shadow border-white/5 bg-card/40 backdrop-blur-xl"
          >
            <div className="w-full h-40 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl mb-4 border border-white/5 flex items-center justify-center">
              <span className="text-3xl font-extrabold text-white/10">
                {business.name.charAt(0)}
              </span>
            </div>
            <h3 className="font-semibold text-foreground mb-2">{business.name}</h3>
            <div className="flex items-center gap-2 text-sm mb-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{business.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({business.reviews})</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
              <MapPin className="h-4 w-4" />
              {business.distance}
            </div>
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
    </div>
  );
}

export default function CategoryPage() {
  return (
    <PublicLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        }
      >
        <CategoryContent />
      </Suspense>
    </PublicLayout>
  );
}
