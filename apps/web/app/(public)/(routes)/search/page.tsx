'use client';

import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, SlidersHorizontal, Star, MapPin } from 'lucide-react';
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
  },
  {
    id: 2,
    name: 'Tech Solutions',
    category: 'Services',
    rating: 4.6,
    reviews: 156,
    distance: '1.2 km',
    verified: true,
  },
  {
    id: 3,
    name: 'Fashion Hub',
    category: 'Shopping',
    rating: 4.5,
    reviews: 89,
    distance: '0.8 km',
    verified: true,
  },
  {
    id: 4,
    name: 'Health Plus Clinic',
    category: 'Healthcare',
    rating: 4.9,
    reviews: 342,
    distance: '1.5 km',
    verified: true,
  },
];

export default function SearchPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-6">Search Businesses</h1>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, category, or service..."
              className="pl-10 py-3 rounded-lg text-base"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <Button variant="outline" className="rounded-lg gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Button>
            <Select>
              <SelectTrigger className="w-40 rounded-lg">
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
            <Select>
              <SelectTrigger className="w-40 rounded-lg">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevant">Most Relevant</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="distance">Nearest</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {mockResults.map((result) => (
            <Card
              key={result.id}
              className="p-6 rounded-2xl hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex gap-6">
                {/* Business Image Placeholder */}
                <div className="w-32 h-32 rounded-xl bg-secondary flex-shrink-0"></div>

                {/* Business Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{result.name}</h3>
                      <p className="text-sm text-muted-foreground">{result.category}</p>
                    </div>
                    {result.verified && (
                      <span className="px-3 py-1 bg-accent text-accent-foreground text-xs rounded-full font-medium">
                        Verified
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm mb-4">
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

                  <Button variant="outline" className="rounded-lg" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
