'use client';

import { PublicLayout } from '@/components/layouts/public-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, MapPin, Star, Zap, Megaphone, Shield } from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    icon: Search,
    title: 'Smart Search',
    description: 'Find businesses and services using advanced filters and search',
  },
  {
    icon: MapPin,
    title: 'Nearby Discovery',
    description: 'Discover businesses near you with location-based recommendations',
  },
  {
    icon: Star,
    title: 'Reviews & Ratings',
    description: 'Read verified reviews and ratings from real customers',
  },
  {
    icon: Zap,
    title: 'Exclusive Offers',
    description: 'Get special deals and exclusive offers from your favorite businesses',
  },
  {
    icon: Megaphone,
    title: 'Government Notices',
    description: 'Stay informed with important announcements and civic updates',
  },
  {
    icon: Shield,
    title: 'Verified & Safe',
    description: 'All businesses verified for authenticity and customer safety',
  },
];

const categories = [
  'Restaurants',
  'Shopping',
  'Services',
  'Entertainment',
  'Healthcare',
  'Education',
  'Travel',
  'Technology',
];

export default function HomePage() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <div className="mb-12 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 px-8 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
          Discover Local Businesses & Services
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Find verified businesses, read real reviews, and get exclusive offers in your area
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/search">
            <Button className="rounded-lg" size="lg">
              <Search className="mr-2 h-5 w-5" />
              Start Searching
            </Button>
          </Link>
          <Link href="/nearby">
            <Button variant="outline" className="rounded-lg" size="lg">
              <MapPin className="mr-2 h-5 w-5" />
              Find Nearby
            </Button>
          </Link>
        </div>
      </div>

      {/* Categories */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-6">Browse Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((category) => (
            <Link key={category} href={`/category?type=${category.toLowerCase()}`}>
              <Card className="p-4 text-center hover:shadow-md hover:border-primary transition-all cursor-pointer rounded-xl">
                <p className="font-medium text-foreground">{category}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-6">Why Choose Us</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="p-6 rounded-2xl">
                <div className="mb-4 rounded-xl bg-primary/10 w-12 h-12 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* CTA Section */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-accent px-8 py-12 text-center text-primary-foreground">
        <h2 className="text-3xl font-bold mb-4">Ready to Find Your Next Favorite Business?</h2>
        <p className="mb-6 text-primary-foreground/90">
          Join thousands of users discovering amazing local businesses every day
        </p>
        <Link href="/search">
          <Button
            variant="outline"
            className="rounded-lg bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            size="lg"
          >
            Get Started Now
          </Button>
        </Link>
      </div>
    </PublicLayout>
  );
}
