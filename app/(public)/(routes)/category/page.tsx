'use client'

import { PublicLayout } from '@/components/layouts/public-layout'
import { Card } from '@/components/ui/card'
import { Star, MapPin } from 'lucide-react'

const businesses = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: `Business ${i + 1}`,
  rating: 4.5 + Math.random() * 0.5,
  reviews: Math.floor(50 + Math.random() * 400),
  distance: `${(0.5 + Math.random() * 2).toFixed(1)} km`,
}))

export default function CategoryPage() {
  return (
    <PublicLayout>
      <div>
        <h1 className="text-3xl font-bold mb-2">Restaurants</h1>
        <p className="text-muted-foreground mb-8">Browse businesses in this category</p>

        <div className="grid md:grid-cols-3 gap-6">
          {businesses.map((business) => (
            <Card key={business.id} className="p-4 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="w-full h-40 bg-secondary rounded-xl mb-4"></div>
              <h3 className="font-semibold text-foreground mb-2">{business.name}</h3>
              <div className="flex items-center gap-2 text-sm mb-4">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{business.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">({business.reviews})</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {business.distance}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PublicLayout>
  )
}
