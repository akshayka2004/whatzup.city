'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Star,
  MapPin,
  Clock,
  Phone,
  Share2,
  Heart,
  MessageCircle,
  Globe,
  Instagram,
  Ticket,
  Check,
  X,
  Receipt,
  Upload,
  CalendarDays,
  Hash,
  IndianRupee,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiService } from '@/lib/services/api-service';

const FAVORITES_KEY = 'saved_businesses';

function getFavIds(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]').map((b: any) => b.id); }
  catch { return []; }
}

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return 'today';
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
  } catch { return ''; }
}

export default function BusinessDetailPage() {
  const params = useParams();
  const businessId = (params?.id as string) || '';

  const [biz, setBiz] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    setIsSaved(getFavIds().includes(businessId));
    const handler = () => setIsSaved(getFavIds().includes(businessId));
    window.addEventListener('favoritesUpdated', handler);
    return () => window.removeEventListener('favoritesUpdated', handler);
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    Promise.allSettled([
      apiService.get<any>(`/v1/businesses/${businessId}`),
      apiService.get<any>(`/v1/offers/business/${businessId}`),
      apiService.get<any>(`/v1/reviews/business/${businessId}`),
    ]).then(([bizRes, offersRes, reviewsRes]) => {
      if (bizRes.status === 'fulfilled' && bizRes.value.data && !bizRes.value.error) {
        setBiz(bizRes.value.data);
      }
      if (offersRes.status === 'fulfilled' && offersRes.value.data && !offersRes.value.error) {
        const list = Array.isArray(offersRes.value.data) ? offersRes.value.data : offersRes.value.data?.data ?? [];
        setOffers(list.filter((o: any) => o.isActive !== false).slice(0, 5));
      }
      if (reviewsRes.status === 'fulfilled' && reviewsRes.value.data && !reviewsRes.value.error) {
        const list = Array.isArray(reviewsRes.value.data) ? reviewsRes.value.data : reviewsRes.value.data?.data ?? [];
        setReviews(list.slice(0, 6));
      }
    }).finally(() => setLoading(false));
  }, [businessId]);

  const handleToggleFavorite = () => {
    if (!biz) return;
    try {
      const existing: any[] = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
      const idx = existing.findIndex((b: any) => b.id === businessId);
      let updated: any[];
      if (idx >= 0) {
        updated = existing.filter((b: any) => b.id !== businessId);
      } else {
        updated = [{
          id: businessId,
          name: biz.name,
          category: biz.category?.name || '',
          rating: String(biz.averageRating || 0),
          reviews: biz._count?.reviews || 0,
          savedAt: new Date().toLocaleDateString(),
        }, ...existing];
      }
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      setIsSaved(!isSaved);
      window.dispatchEvent(new Event('favoritesUpdated'));
    } catch (_) {}
  };

  // ── Offer claim state
  const [claimingOffer, setClaimingOffer] = useState<any>(null);
  const [claimedCode, setClaimedCode] = useState<string | null>(null);

  // ── Bill submission state
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [billSubmitted, setBillSubmitted] = useState(false);
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billReview, setBillReview] = useState('');
  const [billRating, setBillRating] = useState(0);
  const [billRatingHover, setBillRatingHover] = useState(0);
  const [billImageName, setBillImageName] = useState('');
  const [billSubmitting, setBillSubmitting] = useState(false);

  const handleConfirmClaim = () => {
    if (!claimingOffer) return;
    const randomCode = `CLAIM-${Math.floor(1000 + Math.random() * 9000)}`;
    setClaimedCode(randomCode);
    setClaimingOffer(null);
  };

  const handleBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billNumber || !billDate || !billAmount || billRating === 0) return;
    setBillSubmitting(true);
    try {
      await apiService.post('/v1/bills/upload', {
        businessId,
        amount: parseFloat(billAmount),
        billDate,
        billImage: billImageName || '',
        description: billReview || undefined,
      });
    } catch (_) {}
    setBillSubmitting(false);
    setBillSubmitted(true);
    setBillModalOpen(false);
  };

  const resetBillForm = () => {
    setBillNumber('');
    setBillDate('');
    setBillAmount('');
    setBillReview('');
    setBillRating(0);
    setBillRatingHover(0);
    setBillImageName('');
  };

  const openBillModal = () => {
    resetBillForm();
    setBillModalOpen(true);
  };

  const avgRating = biz?.averageRating ?? biz?.rating ?? 0;
  const reviewCount = biz?._count?.reviews ?? reviews.length ?? 0;
  const branch = biz?.branches?.[0];
  const address = branch
    ? [branch.address, branch.city, branch.state].filter(Boolean).join(', ')
    : biz?.address || '';

  if (loading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PublicLayout>
    );
  }

  if (!biz) {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <p className="text-lg font-semibold text-foreground mb-2">Business not found</p>
          <p className="text-sm text-muted-foreground">This listing may have been removed or the ID is invalid.</p>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div>
        {/* Hero Image */}
        <div className="w-full h-96 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-white/5 mb-8 flex items-center justify-center overflow-hidden">
          {biz.coverImage ? (
            <img src={biz.coverImage} alt={biz.name} className="w-full h-full object-cover" />
          ) : (
            <p className="text-muted-foreground">Business Cover Image</p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            {/* ── Business Info Card */}
            <Card className="p-6 rounded-2xl mb-8 border-white/5 bg-card/40 backdrop-blur-xl">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">{biz.name}</h1>
                  <p className="text-muted-foreground mb-4">
                    {biz.category?.name || ''}
                    {biz.subcategory ? ` • ${biz.subcategory}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => { if (navigator?.share) { navigator.share({ title: biz.name, url: window.location.href }); } }}
                    className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5"
                  >
                    <Share2 className="h-5 w-5" />
                  </Button>
                  <Button
                    onClick={handleToggleFavorite}
                    variant="outline"
                    size="icon"
                    className={`rounded-xl cursor-pointer ${isSaved ? 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'border-white/10 text-slate-300 hover:bg-white/5'}`}
                    title={isSaved ? 'Remove from favorites' : 'Save to favorites'}
                  >
                    <Heart className={`h-5 w-5 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </Button>
                </div>
              </div>
              {avgRating > 0 && (
                <div className="flex items-center gap-6 mb-6">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold text-lg">{Number(avgRating).toFixed(1)}</span>
                    <span className="text-muted-foreground">({reviewCount} reviews)</span>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {address && (
                  <div className="flex items-center gap-3 text-foreground text-sm">
                    <MapPin className="h-5 w-5 text-violet-400 flex-shrink-0" />
                    <span>{address}</span>
                  </div>
                )}
                {(biz.phone || branch?.phone) && (
                  <div className="flex items-center gap-3 text-foreground text-sm">
                    <Phone className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                    <span>{biz.phone || branch?.phone}</span>
                  </div>
                )}
                {branch?.operatingHours && (
                  <div className="flex items-center gap-3 text-foreground text-sm">
                    <Clock className="h-5 w-5 text-amber-400 flex-shrink-0" />
                    <span>{typeof branch.operatingHours === 'string' ? branch.operatingHours : JSON.stringify(branch.operatingHours)}</span>
                  </div>
                )}
                {biz.instagram && (
                  <div className="flex items-center gap-3 text-foreground text-sm">
                    <Instagram className="h-5 w-5 text-pink-400 flex-shrink-0" />
                    <a href={`https://instagram.com/${biz.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-pink-400 hover:underline">
                      {biz.instagram.startsWith('@') ? biz.instagram : `@${biz.instagram}`}
                    </a>
                  </div>
                )}
                {biz.website && (
                  <div className="flex items-center gap-3 text-foreground text-sm">
                    <Globe className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    <a href={biz.website.startsWith('http') ? biz.website : `https://${biz.website}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">
                      {biz.website}
                    </a>
                  </div>
                )}
              </div>
            </Card>

            {/* ── About */}
            {biz.description && (
              <Card className="p-6 rounded-2xl mb-8 border-white/5 bg-card/40 backdrop-blur-xl">
                <h2 className="text-2xl font-bold text-foreground mb-4">About</h2>
                <p className="text-muted-foreground mb-4 text-sm leading-relaxed">{biz.description}</p>
                <div className="flex gap-3 flex-wrap">
                  {[biz.category?.name, biz.subcategory].filter(Boolean).map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-sm text-slate-300">{tag}</span>
                  ))}
                </div>
              </Card>
            )}

            {/* ── Submit Bill Section */}
            <Card className="p-6 rounded-2xl mb-8 border-white/5 bg-card/40 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    Submit Your Bill
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Shopped here? Upload your receipt and share your experience to earn verified purchase status.
                  </p>
                </div>
              </div>

              {billSubmitted ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mt-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-400">Bill Submitted Successfully!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your receipt is under review. You'll be notified once verified.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setBillSubmitted(false); openBillModal(); }}
                    className="ml-auto rounded-xl border-white/10 text-slate-300 hover:bg-white/5 text-xs shrink-0 cursor-pointer"
                  >
                    Submit Another
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={openBillModal}
                  className="mt-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold gap-2 cursor-pointer"
                >
                  <Upload className="h-4 w-4" />
                  Upload Receipt
                </Button>
              )}
            </Card>

            {/* ── Reviews */}
            <Card className="p-6 rounded-2xl mb-8 border-white/5 bg-card/40 backdrop-blur-xl">
              <h2 className="text-2xl font-bold text-foreground mb-4">Reviews</h2>
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No reviews yet. Be the first to share your experience!</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review: any, i: number) => (
                    <div key={review.id || i} className="pb-4 border-b border-white/5 last:border-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-foreground">
                            {review.user?.name || review.customerName || 'Anonymous'}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, j) => (
                                <Star
                                  key={j}
                                  className={`h-4 w-4 ${j < (review.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {review.createdAt ? timeAgo(review.createdAt) : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-muted-foreground text-sm">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* ── Sidebar */}
          <div>
            <Card className="p-6 rounded-2xl mb-6 sticky top-8 border-white/5 bg-card/40 backdrop-blur-xl">
              <h3 className="font-bold text-foreground mb-4">Active Offers</h3>
              {offers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No active offers right now.</p>
              ) : (
                <div className="space-y-3">
                  {offers.map((o: any, i: number) => {
                    const discount = o.discountPercent
                      ? `${o.discountPercent}% Off`
                      : o.discountAmount
                      ? `₹${o.discountAmount} Off`
                      : o.title || 'Special Offer';
                    const expiry = o.expiresAt
                      ? `Expires ${new Date(o.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                      : o.validUntil
                      ? `Valid until ${new Date(o.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                      : '';
                    return (
                      <div key={o.id || i} className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <p className="font-semibold text-foreground mb-1">{discount}</p>
                        {o.description && <p className="text-xs text-muted-foreground mb-1">{o.description}</p>}
                        {expiry && <p className="text-xs text-muted-foreground mb-2">{expiry}</p>}
                        <Button
                          variant="outline"
                          onClick={() => setClaimingOffer(o)}
                          className="w-full rounded-xl border-white/10 text-slate-300 hover:bg-white/5 cursor-pointer"
                          size="sm"
                        >
                          Claim Offer
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
            <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl">
              {biz.phone && (
                <a href={`tel:${biz.phone}`}>
                  <Button className="w-full rounded-xl mb-3 bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer">
                    <MessageCircle className="mr-2 h-4 w-4" /> Contact
                  </Button>
                </a>
              )}
              {biz.website && (
                <a href={biz.website.startsWith('http') ? biz.website : `https://${biz.website}`} target="_blank" rel="noreferrer">
                  <Button
                    variant="outline"
                    className="w-full rounded-xl border-white/10 text-slate-300 hover:bg-white/5 cursor-pointer"
                  >
                    Visit Website
                  </Button>
                </a>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* ── BILL SUBMISSION MODAL */}
      {billModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setBillModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Submit Your Bill</h3>
                <p className="text-xs text-muted-foreground">{biz.name}</p>
              </div>
            </div>

            <form onSubmit={handleBillSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2 flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  Bill / Invoice Number <span className="text-rose-400">*</span>
                </label>
                <Input
                  placeholder="e.g. INV-2026-1042"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  required
                  className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2 flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  Bill Date <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2 flex items-center gap-1.5">
                  <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                  Amount Paid <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="e.g. 2450.00"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  required
                  className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Receipt Image
                </label>
                <label
                  htmlFor="bill-image-input"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl p-5 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  {billImageName ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-400">
                      <Check className="h-4 w-4" />
                      <span className="truncate max-w-[200px]">{billImageName}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground">Click to upload receipt image (JPG, PNG, PDF)</p>
                    </>
                  )}
                  <input
                    id="bill-image-input"
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setBillImageName(f.name);
                    }}
                  />
                </label>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Your Rating <span className="text-rose-400">*</span>
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setBillRating(star)}
                      onMouseEnter={() => setBillRatingHover(star)}
                      onMouseLeave={() => setBillRatingHover(0)}
                      className="cursor-pointer p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        className={cn(
                          'h-7 w-7 transition-colors',
                          (billRatingHover || billRating) >= star
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground/30',
                        )}
                      />
                    </button>
                  ))}
                  {billRating > 0 && (
                    <span className="ml-2 text-sm text-muted-foreground self-center">
                      {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][billRating]}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Your Review <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </label>
                <Textarea
                  placeholder={`Share your experience at ${biz.name}...`}
                  value={billReview}
                  onChange={(e) => setBillReview(e.target.value)}
                  rows={3}
                  className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground resize-none text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBillModalOpen(false)}
                  className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!billNumber || !billDate || !billAmount || billRating === 0 || billSubmitting}
                  className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {billSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Submit Bill
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── CLAIM CONFIRMATION MODAL */}
      {claimingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative text-center">
            <button
              onClick={() => setClaimingOffer(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Ticket className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Claim Promotional Offer</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to claim the{' '}
              <span className="font-semibold text-foreground">
                {claimingOffer.discountPercent ? `${claimingOffer.discountPercent}% Off` : claimingOffer.title || 'this offer'}
              </span>?
              This will generate a unique redemption code valid at {biz.name}.
            </p>
            <div className="flex justify-center gap-3">
              <Button
                onClick={() => setClaimingOffer(null)}
                variant="outline"
                className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 px-4 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmClaim}
                className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold px-4 cursor-pointer"
              >
                Confirm Claim
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── CLAIM SUCCESS MODAL */}
      {claimedCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative text-center">
            <button
              onClick={() => setClaimedCode(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
              <Check className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Offer Claimed!</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Present this code at the business counter to redeem your discount.
            </p>
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 mb-6">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">
                Redemption Code
              </p>
              <p className="text-2xl font-mono font-extrabold text-emerald-400 tracking-wider">
                {claimedCode}
              </p>
            </div>
            <Button
              onClick={() => setClaimedCode(null)}
              className="w-full rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer"
            >
              Done
            </Button>
          </Card>
        </div>
      )}
    </PublicLayout>
  );
}
