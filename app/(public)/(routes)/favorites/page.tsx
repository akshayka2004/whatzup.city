'use client'

import { PublicLayout } from '@/components/layouts/public-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart, Trash2, Star } from 'lucide-react'

const favorites = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  name: `Favorite Business ${i + 1}`,
  category: ['Restaurant', 'Shop', 'Service'][i % 3],
  rating: (4 + Math.random() * 0.9).toFixed(1),
  reviews: Math.floor(50 + Math.random() * 400),
  addedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
}))

export default function FavoritesPage() {
  return (
    <PublicLayout>
      <div>
        <h1 className="text-3xl font-bold mb-2">Saved Businesses</h1>
        <p className="text-muted-foreground mb-8">Your collection of favorite businesses and services</p>

        {favorites.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {favorites.map((favorite) => (
              <Card key={favorite.id} className="p-6 rounded-2xl hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">{favorite.name}</h3>
                    <p className="text-sm text-muted-foreground">{favorite.category}</p>
                  </div>
                  <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                </div>
                
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{favorite.rating}</span>
                    <span className="text-muted-foreground">({favorite.reviews})</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 rounded-lg" size="sm">
                    Visit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 rounded-2xl text-center">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Saved Businesses Yet</h3>
            <p className="text-muted-foreground mb-6">Start saving your favorite businesses to access them quickly</p>
            <Button className="rounded-lg">Browse Businesses</Button>
          </Card>
        )}
      </div>
    </PublicLayout>
  )
}
