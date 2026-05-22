'use client';

import { useState, useMemo, useEffect } from 'react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tag, Calendar, X, Eye, CheckCircle2, Sparkles } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const businessTypes = [
  'Food & Dining',
  'Clothing & Fashion',
  'Electronics',
  'Health & Wellness',
  'Services',
  'Shopping',
];

const OFFERS_DATA = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  title: `Special Offer ${i + 1}`,
  description: `${[20, 30, 40, 50, 15, 25, 35, 45, 60, 10, 55, 70][i]}% off on selected items`,
  business: [`Bella Restaurant`, `TechHub Electronics`, `FashionStore`, `Wellness Clinic`, `Pro Services`, `ShopEasy`, `Cafe Nero`, `Gadget World`, `Style Hub`, `HealthPlus`, `QuickFix`, `MegaStore`][i],
  businessId: (i % 4) + 1,
  businessType: businessTypes[i % businessTypes.length],
  discount: [20, 30, 40, 50, 15, 25, 35, 45, 60, 10, 55, 70][i],
  expiresIn: [5, 12, 3, 7, 20, 14, 8, 2, 18, 30, 6, 11][i],
  terms: 'Valid on minimum purchase of $50. Cannot be combined with other offers. One per customer per visit.',
}));

const STORAGE_KEY = 'claimed_offers';

function getClaimedOffers(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveClaimedOffer(id: number) {
  const existing = getClaimedOffers();
  if (!existing.includes(id)) {
    const updated = [...existing, id];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Fire storage event for cross-tab sync
    window.dispatchEvent(new Event('claimedOffersUpdated'));
    return updated.length;
  }
  return existing.length;
}

export default function OffersPage() {
  const [viewingOffer, setViewingOffer] = useState<any>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [claimedIds, setClaimedIds] = useState<number[]>([]);
  const [justClaimed, setJustClaimed] = useState<number | null>(null);

  useEffect(() => {
    setClaimedIds(getClaimedOffers());
  }, []);

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return OFFERS_DATA;
    return OFFERS_DATA.filter((o) => o.businessType === typeFilter);
  }, [typeFilter]);

  const handleClaim = (offer: (typeof OFFERS_DATA)[0]) => {
    saveClaimedOffer(offer.id);
    setClaimedIds(getClaimedOffers());
    setJustClaimed(offer.id);
    setTimeout(() => setJustClaimed(null), 2500);
    if (viewingOffer?.id === offer.id) setViewingOffer(null);
  };

  const isClaimed = (id: number) => claimedIds.includes(id);

  return (
    <PublicLayout>
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Exclusive Offers</h1>
            <p className="text-muted-foreground">Find the best deals and exclusive offers</p>
          </div>
          {claimedIds.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {claimedIds.length} claimed
            </div>
          )}
        </div>

        {/* Just-claimed toast */}
        {justClaimed && (
          <div className="fixed top-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-2xl shadow-2xl font-semibold text-sm animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="h-4 w-4" />
            Offer claimed successfully!
          </div>
        )}

        <div className="mb-6">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-52 rounded-xl border-white/10">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {businessTypes.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {filtered.map((offer) => {
            const claimed = isClaimed(offer.id);
            return (
              <Card
                key={offer.id}
                className={`p-6 rounded-2xl hover:shadow-md transition-all border-white/5 bg-card/40 backdrop-blur-xl ${claimed ? 'opacity-70' : ''}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground">{offer.title}</h3>
                    <p className="text-sm text-muted-foreground">{offer.business}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 mt-1 inline-block">
                      {offer.businessType}
                    </span>
                  </div>
                  <div className={`px-3 py-1 rounded-lg font-bold text-lg ${claimed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary/10 text-primary'}`}>
                    {claimed ? <CheckCircle2 className="h-5 w-5" /> : `${offer.discount}%`}
                  </div>
                </div>
                <p className="text-sm mb-4 text-muted-foreground">{offer.description}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Calendar className="h-4 w-4" /> Expires in {offer.expiresIn} days
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setViewingOffer(offer)}
                    variant="outline"
                    className="flex-1 rounded-xl gap-1.5 border-white/10 text-slate-300 hover:bg-white/5 cursor-pointer"
                    size="sm"
                  >
                    <Eye className="h-4 w-4" /> View Details
                  </Button>
                  {claimed ? (
                    <div className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold px-3 py-2">
                      <CheckCircle2 className="h-4 w-4" /> Claimed
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleClaim(offer)}
                      className="flex-1 rounded-xl gap-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer"
                      size="sm"
                    >
                      <Sparkles className="h-4 w-4" /> Claim Offer
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* VIEW MODAL */}
        {viewingOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative">
              <button onClick={() => setViewingOffer(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <Tag className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{viewingOffer.title}</h3>
                  <p className="text-xs text-muted-foreground">{viewingOffer.business} • {viewingOffer.businessType}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                  <p className="text-xs text-muted-foreground mb-1">Discount</p>
                  <p className="text-3xl font-extrabold text-foreground">{viewingOffer.discount}%</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                  <p className="text-xs text-muted-foreground mb-1">Expires In</p>
                  <p className="text-3xl font-extrabold text-foreground">{viewingOffer.expiresIn}d</p>
                </div>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 mb-6">
                <p className="text-xs text-muted-foreground font-semibold mb-1">Terms & Conditions</p>
                <p className="text-sm text-slate-300">{viewingOffer.terms}</p>
              </div>
              {isClaimed(viewingOffer.id) ? (
                <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold py-3">
                  <CheckCircle2 className="h-5 w-5" /> Already Claimed
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button onClick={() => setViewingOffer(null)} variant="outline" className="flex-1 rounded-xl border-white/10 text-slate-300 hover:bg-white/5 cursor-pointer">
                    Close
                  </Button>
                  <Button onClick={() => handleClaim(viewingOffer)} className="flex-1 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer gap-1.5">
                    <Sparkles className="h-4 w-4" /> Claim Offer
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
