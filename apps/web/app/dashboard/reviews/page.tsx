'use client';

import { useState, useEffect } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';

export default function ReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const businessId = user?.businessId || user?.entity?.id;

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    apiService
      .get<any>(`/v1/reviews/business/${businessId}?page=1`)
      .then((res) => {
        if (res.data && !res.error) {
          const list = Array.isArray(res.data) ? res.data : res.data?.data ?? res.data?.reviews ?? [];
          setReviews(
            list.map((r: any) => ({
              id: r.id,
              author: r.customerName || r.author || r.user?.name || 'Anonymous',
              rating: r.rating ?? 0,
              text: r.comment || r.text || r.body || '',
              date: r.createdAt
                ? new Date(r.createdAt).toISOString().slice(0, 10)
                : r.date || '—',
            })),
          );
        }
      })
      .finally(() => setLoading(false));
  }, [businessId]);
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
          <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-4 py-2">
            <Star className="h-5 w-5 fill-warning text-warning" />
            <span className="font-bold text-foreground text-lg">{avgRating}</span>
            <span className="text-xs text-muted-foreground">avg ({reviews.length} reviews)</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : reviews.length === 0 ? (
          <Card className="p-10 rounded-2xl border-dashed border-border bg-secondary text-center">
            <Star className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-foreground font-semibold mb-1">No reviews yet</p>
            <p className="text-sm text-muted-foreground">Customer reviews will appear here once submitted.</p>
          </Card>
        ) : null}

        <div className="space-y-4">
          {reviews.map((review) => (
            <Card
              key={review.id}
              className="p-6 rounded-2xl border-border bg-card/40 backdrop-blur-xl hover:shadow-md transition-all duration-300 relative overflow-hidden group"
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
                          className={`h-4 w-4 ${i < review.rating ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`}
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
                  className="rounded-xl border-destructive/20 text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9 flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {deletingReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6 rounded-2xl border-border bg-card shadow-2xl relative text-center">
              <button
                onClick={() => setDeletingReview(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4">
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
                  className="rounded-xl border-border hover:bg-secondary text-foreground px-4"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  className="rounded-xl bg-destructive hover:bg-destructive text-white px-4"
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
