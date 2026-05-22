'use client';

import { useState } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Trash2, X, AlertTriangle } from 'lucide-react';

const initialReviews = [
  {
    id: 1,
    author: 'John D.',
    rating: 5,
    text: 'Excellent service, highly recommended!',
    date: '2024-05-16',
  },
  {
    id: 2,
    author: 'Jane S.',
    rating: 4,
    text: 'Good experience overall, would visit again.',
    date: '2024-05-15',
  },
  {
    id: 3,
    author: 'Bob W.',
    rating: 3,
    text: 'Average service, nothing special.',
    date: '2024-05-14',
  },
];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState(initialReviews);
  const [deletingReview, setDeletingReview] = useState<any>(null);

  const handleDelete = () => {
    setReviews(reviews.filter((r) => r.id !== deletingReview.id));
    setDeletingReview(null);
  };

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : '0';

  return (
    <BusinessLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Customer Reviews</h1>
            <p className="text-muted-foreground">Monitor customer feedback and ratings</p>
          </div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            <span className="font-bold text-foreground text-lg">{avgRating}</span>
            <span className="text-xs text-muted-foreground">avg ({reviews.length} reviews)</span>
          </div>
        </div>

        <div className="space-y-4">
          {reviews.map((review) => (
            <Card
              key={review.id}
              className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl hover:shadow-md transition-all duration-300 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground">{review.author}</h3>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{review.date}</p>
                  <p className="text-foreground text-sm">{review.text}</p>
                </div>
                <Button
                  onClick={() => setDeletingReview(review)}
                  size="icon"
                  variant="outline"
                  className="rounded-xl border-rose-500/20 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-9 w-9 flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {deletingReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative text-center">
              <button
                onClick={() => setDeletingReview(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Delete Review</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Remove review by{' '}
                <span className="font-semibold text-foreground">"{deletingReview.author}"</span>?
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => setDeletingReview(null)}
                  variant="outline"
                  className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 px-4"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4"
                >
                  Delete
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </BusinessLayout>
  );
}
