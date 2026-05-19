'use client';

import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, MessageSquare, Trash2 } from 'lucide-react';

const reviews = [
  {
    id: 1,
    author: 'John D.',
    rating: 5,
    text: 'Excellent service, highly recommended!',
    date: '2024-05-16',
    replied: false,
  },
  {
    id: 2,
    author: 'Jane S.',
    rating: 4,
    text: 'Good experience overall, would visit again.',
    date: '2024-05-15',
    replied: true,
  },
  {
    id: 3,
    author: 'Bob W.',
    rating: 3,
    text: 'Average service, nothing special.',
    date: '2024-05-14',
    replied: false,
  },
];

export default function ReviewsPage() {
  return (
    <BusinessLayout>
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Reviews</h1>
        <p className="text-muted-foreground mb-8">Manage customer reviews and ratings</p>

        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} className="p-6 rounded-2xl">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground">{review.author}</h3>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm mb-3">{review.date}</p>
                  <p className="text-foreground">{review.text}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={review.replied ? 'outline' : 'default'}
                    className="rounded-lg gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {review.replied ? 'View Reply' : 'Reply'}
                  </Button>
                  <Button size="icon" variant="outline" className="rounded-lg text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </BusinessLayout>
  );
}
