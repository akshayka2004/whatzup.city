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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const FAVORITES_KEY = 'saved_businesses';

// Mock business data — keyed by numeric ID
const MOCK_BUSINESSES: Record<number, {
  name: string; category: string; subcategory: string; phone: string;
  address: string; hours: string; website: string; instagram: string; rating: number; reviews: number;
}> = {
  1: { name: 'Bella Restaurant', category: 'Restaurants', subcategory: 'Fine Dining', phone: '+91 98765 43210', address: '12 MG Road, Bengaluru, KA 560001', hours: 'Mon–Sun: 11AM–11PM', website: 'bellarestaurant.in', instagram: '@bellarestaurant', rating: 4.8, reviews: 234 },
  2: { name: 'Health Plus Clinic', category: 'Healthcare', subcategory: 'General Medicine', phone: '+91 98765 11111', address: '45 Residency Rd, Bengaluru, KA 560025', hours: 'Mon–Sat: 9AM–6PM', website: 'healthplusclinic.in', instagram: '@healthplusclinic', rating: 4.9, reviews: 342 },
  3: { name: 'Fashion Hub Boutique', category: 'Shopping', subcategory: 'Clothing & Apparel', phone: '+91 98765 22222', address: '8 Commercial St, Bengaluru, KA 560001', hours: 'Mon–Sun: 10AM–9PM', website: 'fashionhub.in', instagram: '@fashionhub', rating: 4.5, reviews: 89 },
  4: { name: 'Tech Solutions Ltd.', category: 'Professional Services', subcategory: 'IT Consulting', phone: '+91 98765 33333', address: '21 Electronics City, Bengaluru, KA 560100', hours: 'Mon–Fri: 9AM–6PM', website: 'techsolutions.in', instagram: '@techsolutionsltd', rating: 4.6, reviews: 156 },
};

function getBusiness(id: number) {
  return MOCK_BUSINESSES[id] || { ...MOCK_BUSINESSES[1], name: `Business #${id}` };
}

function getFavIds(): number[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]').map((b: any) => b.id); }
  catch { return []; }
}

export default function BusinessDetailPage() {
  const params = useParams();
  const businessId = Number(params?.id) || 1;
  const biz = getBusiness(businessId);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setIsSaved(getFavIds().includes(businessId));
    const handler = () => setIsSaved(getFavIds().includes(businessId));
    window.addEventListener('favoritesUpdated', handler);
    return () => window.removeEventListener('favoritesUpdated', handler);
  }, [businessId]);

  const handleToggleFavorite = () => {
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
          category: biz.category,
          rating: String(biz.rating),
          reviews: biz.reviews,
          savedAt: new Date().toLocaleDateString(),
        }, ...existing];
      }
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      setIsSaved(!isSaved);
      window.dispatchEvent(new Event('favoritesUpdated'));
    } catch (_) {}
  };

  // ── Offer claim state ──────────────────────────────────────
  const [claimingOffer, setClaimingOffer] = useState<{ pct: string; exp: string } | null>(null);
  const [claimedCode, setClaimedCode] = useState<string | null>(null);

  // ── Bill submission state ──────────────────────────────────
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [billSubmitted, setBillSubmitted] = useState(false);
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billReview, setBillReview] = useState('');
  const [billRating, setBillRating] = useState(0);
  const [billRatingHover, setBillRatingHover] = useState(0);
  const [billImageName, setBillImageName] = useState('');

  const handleConfirmClaim = () => {
    if (!claimingOffer) return;
    const randomCode = `CLAIM-${Math.floor(1000 + Math.random() * 9000)}`;
    setClaimedCode(randomCode);
    setClaimingOffer(null);
  };

  const handleBillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billNumber || !billDate || !billAmount || billRating === 0) return;
    try {
      // Persist bill to localStorage for moderator queue
      const BILLS_KEY = 'submitted_bills';
      const existing = JSON.parse(localStorage.getItem(BILLS_KEY) || '[]');
      const newBill = {
        id: `BILL-${Date.now()}`,
        billNumber,
        billDate,
        amount: billAmount,
        review: billReview,
        rating: billRating,
        businessId,
        businessName: biz.name,
        submittedAt: new Date().toISOString(),
        status: 'PENDING',
        imageFile: billImageName || null,
      };
      localStorage.setItem(BILLS_KEY, JSON.stringify([newBill, ...existing]));
      // Track converted sales count for admin stats
      const prev = parseInt(localStorage.getItem('converted_sales_count') || '0', 10);
      localStorage.setItem('converted_sales_count', String(prev + 1));
      window.dispatchEvent(new Event('billsUpdated'));
    } catch (_) {}
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

  return (
    <PublicLayout>
      <div>
        {/* Hero Image */}
        <div className="w-full h-96 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-white/5 mb-8 flex items-center justify-center">
          <p className="text-muted-foreground">Business Cover Image</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            {/* ── Business Info Card ─────────────────────────── */}
            <Card className="p-6 rounded-2xl mb-8 border-white/5 bg-card/40 backdrop-blur-xl">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">{biz.name}</h1>
                  <p className="text-muted-foreground mb-4">{biz.category} • {biz.subcategory}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
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
              <div className="flex items-center gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-lg">{biz.rating}</span>
                  <span className="text-muted-foreground">({biz.reviews} reviews)</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-foreground text-sm">
                  <MapPin className="h-5 w-5 text-violet-400 flex-shrink-0" />
                  <span>{biz.address}</span>
                </div>
                <div className="flex items-center gap-3 text-foreground text-sm">
                  <Phone className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                  <span>{biz.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-foreground text-sm">
                  <Clock className="h-5 w-5 text-amber-400 flex-shrink-0" />
                  <span>{biz.hours}</span>
                </div>
                <div className="flex items-center gap-3 text-foreground text-sm">
                  <Instagram className="h-5 w-5 text-pink-400 flex-shrink-0" />
                  <a href="#" className="text-pink-400 hover:underline">
                    {biz.instagram}
                  </a>
                </div>
                <div className="flex items-center gap-3 text-foreground text-sm">
                  <Globe className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  <a href="#" className="text-emerald-400 hover:underline">
                    {biz.website}
                  </a>
                </div>
              </div>
            </Card>

            {/* ── About ──────────────────────────────────────── */}
            <Card className="p-6 rounded-2xl mb-8 border-white/5 bg-card/40 backdrop-blur-xl">
              <h2 className="text-2xl font-bold text-foreground mb-4">About</h2>
              <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                {biz.name} is a verified business on our platform offering top-quality {biz.subcategory.toLowerCase()} services in {biz.category}. Located at {biz.address}.
              </p>
              <div className="flex gap-3 flex-wrap">
                {[biz.category, biz.subcategory, 'Verified'].map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-sm text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Card>

            {/* ── Submit Bill Section ────────────────────────── */}
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

            {/* ── Reviews ────────────────────────────────────── */}
            <Card className="p-6 rounded-2xl mb-8 border-white/5 bg-card/40 backdrop-blur-xl">
              <h2 className="text-2xl font-bold text-foreground mb-4">Reviews</h2>
              <div className="space-y-4">
                {[
                  {
                    name: 'John D.',
                    rating: 5,
                    text: 'Amazing food and ambiance! The pasta was to die for.',
                    time: '2 days ago',
                  },
                  {
                    name: 'Sarah M.',
                    rating: 4,
                    text: 'Great experience overall. Service was a bit slow during peak hours.',
                    time: '1 week ago',
                  },
                  {
                    name: 'Mike R.',
                    rating: 5,
                    text: 'Best Italian restaurant in town. Highly recommended!',
                    time: '2 weeks ago',
                  },
                ].map((review, i) => (
                  <div key={i} className="pb-4 border-b border-white/5 last:border-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-foreground">{review.name}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, j) => (
                              <Star
                                key={j}
                                className={`h-4 w-4 ${j < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">{review.time}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm">{review.text}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ── Sidebar ──────────────────────────────────────── */}
          <div>
            <Card className="p-6 rounded-2xl mb-6 sticky top-8 border-white/5 bg-card/40 backdrop-blur-xl">
              <h3 className="font-bold text-foreground mb-4">Active Offers</h3>
              <div className="space-y-3">
                {[
                  { pct: '50%', exp: '5 days' },
                  { pct: '30%', exp: '12 days' },
                ].map((o, i) => (
                  <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <p className="font-semibold text-foreground mb-1">{o.pct} Off</p>
                    <p className="text-xs text-muted-foreground mb-2">Expires in {o.exp}</p>
                    <Button
                      variant="outline"
                      onClick={() => setClaimingOffer(o)}
                      className="w-full rounded-xl border-white/10 text-slate-300 hover:bg-white/5 cursor-pointer"
                      size="sm"
                    >
                      Claim Offer
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl">
              <Button className="w-full rounded-xl mb-3 bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer">
                <MessageCircle className="mr-2 h-4 w-4" /> Contact
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-xl border-white/10 text-slate-300 hover:bg-white/5 cursor-pointer"
              >
                Visit Website
              </Button>
            </Card>
          </div>
        </div>
      </div>

      {/* ── BILL SUBMISSION MODAL ──────────────────────────── */}
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
              {/* Bill Number */}
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

              {/* Bill Date */}
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

              {/* Amount */}
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

              {/* Receipt Image */}
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

              {/* Rating */}
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

              {/* Review Text */}
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

              {/* Submit */}
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
                  disabled={!billNumber || !billDate || !billAmount || billRating === 0}
                  className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold disabled:opacity-50 cursor-pointer"
                >
                  Submit Bill
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── CLAIM CONFIRMATION MODAL ────────────────────── */}
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
              <span className="font-semibold text-foreground">{claimingOffer.pct} Off</span> offer?
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

      {/* ── CLAIM SUCCESS MODAL ───────────────────────── */}
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
