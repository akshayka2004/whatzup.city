'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Check, CheckCircle2, Receipt, Star, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CountUp } from '@/components/common/count-up';
import { EmptyState } from '@/components/common/empty-state';
import { ResponsiveImage } from '@/components/common/responsive-image';
import { Skel } from '@/components/common/skeletons';
import { SectionCard, SectionHeading, Stars } from './profile-ui';
import { ReviewListSkeleton } from './profile-skeletons';
import { timeAgo } from './profile-utils';

function DialogLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" aria-busy="true">
      <div className="w-full space-y-4 rounded-t-3xl border border-border bg-card p-6 sm:max-w-lg sm:rounded-2xl">
        <Skel className="h-6 w-40" />
        <Skel className="h-11 w-full rounded-xl" />
        <Skel className="h-11 w-full rounded-xl" />
        <Skel className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}

// The bill / review form is heavy and rarely opened — fetch it only when asked for.
const loadBillDialog = () => import('./bill-dialog');
const BillDialog = dynamic(loadBillDialog, { ssr: false, loading: () => <DialogLoading /> });

const PREVIEW = 6;

export function ReviewsSection({
  biz,
  businessId,
  reviews,
  loading,
  avgRating,
  reviewCount,
  user,
  authLoading,
  onReviewPosted,
}: {
  biz: any;
  businessId: string;
  reviews: any[];
  loading: boolean;
  avgRating: number;
  reviewCount: number;
  user: any;
  authLoading: boolean;
  onReviewPosted: () => void | Promise<unknown>;
}) {
  const router = useRouter();
  const [billOpen, setBillOpen] = useState(false);
  const [billSubmitted, setBillSubmitted] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const histogram = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // index 0 = 1 star
    for (const r of reviews) {
      const v = Math.round(Number(r?.rating) || 0);
      if (v >= 1 && v <= 5) counts[v - 1]++;
    }
    return counts;
  }, [reviews]);
  const loaded = reviews.length;

  const openBill = () => {
    // Bills and ratings need an account — send guests to sign in and bring them back here.
    if (!authLoading && !user) {
      router.push(`/login?redirect=${encodeURIComponent(`/business/${businessId}#reviews`)}`);
      return;
    }
    setBillOpen(true);
  };

  const visible = showAll ? reviews : reviews.slice(0, PREVIEW);

  return (
    <section id="reviews" aria-label="Reviews" className="mb-6 scroll-mt-16 lg:col-start-1">
      <SectionCard>
        <SectionHeading icon={Star} title="Reviews" hint={reviewCount > 0 ? `${reviewCount} total` : undefined} />

        {/* ── Rating summary + histogram */}
        {avgRating > 0 && (
          <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-8">
            <div className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-1">
              <CountUp
                value={avgRating}
                duration={900}
                format={(n) => n.toFixed(1)}
                className="text-5xl font-black leading-none text-foreground tabular-nums"
              />
              <div>
                <Stars value={avgRating} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {reviewCount} review{reviewCount === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            {loaded > 0 && (
              <div className="space-y-1.5" aria-label="Rating breakdown">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = histogram[star - 1];
                  const pct = Math.round((count / loaded) * 100);
                  return (
                    <div key={star} className="ui-reveal flex items-center gap-2 text-xs">
                      <span className="w-3 text-right font-semibold text-foreground">{star}</span>
                      <Star className="h-3 w-3 shrink-0 fill-warning text-warning" />
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-warning" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-right tabular-nums text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
                {loaded < reviewCount && (
                  <p className="pt-1 text-xs text-muted-foreground">Based on the latest {loaded} reviews</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Submit Bill / write a verified review */}
        <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-foreground sm:text-lg">Submit Your Bill</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Shopped here? Upload your receipt and share your experience to earn verified purchase status.
              </p>
            </div>
          </div>

          {billSubmitted ? (
            <div className="ui-pop mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-success/25 bg-success/10 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/20 text-success">
                <Check className="ui-check h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-success">Bill Submitted Successfully!</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Your receipt is under review. You&apos;ll be notified once verified.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBillSubmitted(false);
                  openBill();
                }}
                className="min-h-11 shrink-0 rounded-xl text-xs"
              >
                Submit Another
              </Button>
            </div>
          ) : (
            <Button
              onClick={openBill}
              onPointerEnter={() => void loadBillDialog()}
              onFocus={() => void loadBillDialog()}
              onTouchStart={() => void loadBillDialog()}
              size="lg"
              className="ui-press mt-3 w-full gap-2 rounded-xl font-semibold sm:w-auto"
            >
              <Upload className="h-4 w-4" />
              Upload Receipt
            </Button>
          )}
        </div>

        {/* ── Reviews list */}
        {loading ? (
          <ReviewListSkeleton />
        ) : reviews.length === 0 ? (
          <EmptyState
            compact
            icon={Star}
            title="No reviews yet"
            description="Be the first to share your experience!"
            action={{ label: 'Write a review', onClick: openBill }}
          />
        ) : (
          <>
            <ul className="space-y-5">
              {visible.map((review: any, i: number) => {
                const name = review.user?.name || review.customerName || 'Anonymous';
                const verified = !!review.isVerifiedPurchase;
                return (
                  <li
                    key={review.id || i}
                    className={
                      'ui-fade-up ui-cv-auto flex gap-3' +
                      (verified ? ' rounded-r-xl border-l-2 border-success/60 bg-success/5 py-2 pl-3 pr-2' : '')
                    }
                    style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}
                  >
                    {typeof review.user?.avatar === 'string' && review.user.avatar ? (
                      <ResponsiveImage
                        src={review.user.avatar}
                        alt=""
                        ratio="1"
                        className="h-10 w-10 shrink-0 rounded-full"
                        sizes="40px"
                        fallback={<span className="text-sm font-bold text-primary">{name.charAt(0).toUpperCase()}</span>}
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="font-semibold text-foreground">{name}</p>
                        {verified && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/15 px-2.5 py-0.5 text-xs font-bold text-success-foreground dark:text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Verified Purchase
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Stars value={Number(review.rating) || 0} />
                        <span className="text-sm text-muted-foreground">
                          {review.createdAt ? timeAgo(review.createdAt) : ''}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="mt-1.5 break-words text-sm text-muted-foreground">{review.comment}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {reviews.length > PREVIEW && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-3 min-h-11 w-full cursor-pointer rounded-xl text-sm font-semibold text-primary hover:bg-primary/5"
              >
                {showAll ? 'Show fewer reviews' : `Show all ${reviews.length} reviews`}
              </button>
            )}
          </>
        )}
      </SectionCard>

      {billOpen && (
        <BillDialog
          biz={biz}
          businessId={businessId}
          onClose={() => setBillOpen(false)}
          onSubmitted={() => setBillSubmitted(true)}
          onReviewPosted={onReviewPosted}
        />
      )}
    </section>
  );
}
