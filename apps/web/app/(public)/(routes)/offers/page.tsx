'use client';

import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tag, Calendar } from 'lucide-react';

const offers = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  title: `Special Offer ${i + 1}`,
  description: '50% off on selected items',
  business: `Business Name ${i + 1}`,
  discount: Math.floor(10 + Math.random() * 70),
  expiresIn: Math.floor(1 + Math.random() * 30),
}));

export default function OffersPage() {
  return (
    <PublicLayout>
      <div>
        <h1 className="text-3xl font-bold mb-2">Exclusive Offers</h1>
        <p className="text-muted-foreground mb-8">Find the best deals and exclusive offers</p>

        <div className="grid md:grid-cols-2 gap-6">
          {offers.map((offer) => (
            <Card key={offer.id} className="p-6 rounded-2xl hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">{offer.title}</h3>
                  <p className="text-sm text-muted-foreground">{offer.business}</p>
                </div>
                <div className="bg-primary/10 text-primary px-3 py-1 rounded-lg font-bold text-lg">
                  {offer.discount}%
                </div>
              </div>

              <p className="text-sm mb-4 text-muted-foreground">{offer.description}</p>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <Calendar className="h-4 w-4" />
                Expires in {offer.expiresIn} days
              </div>

              <Button className="w-full rounded-lg" size="sm">
                <Tag className="h-4 w-4 mr-2" />
                View Offer
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
