'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tag, Calendar, X, Eye, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiService } from '@/lib/services/api-service';
import { KERALA_CITIES, getViewerCity, setViewerCity } from '@/lib/constants';
import { ReportButton } from '@/components/report-button';

interface Offer {
  id: string;
  title: string;
  description: string;
  business: string;
  businessType: string;
  discount: number;
  discountAmount?: number;
  discountLabel: string;
  expiresAt?: string;
  expiresIn?: number;
  terms?: string;
}

const STORAGE_KEY = 'claimed_offers';

function getClaimedOffers(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function mapApiOffer(o: any): Offer {
  const days = daysUntil(o.expiresAt || o.endDate);
  return {
    id: o.id,
    title: o.title || o.name || 'Offer',
    description: o.description || (o.discountPercent ? `${o.discountPercent}% off` : ''),
    business: o.business?.name || o.businessName || '',
    businessType: o.business?.category?.name || o.category || '',
    discount: o.discountPercent ?? o.discount ?? 0,
    discountAmount: o.discountAmount != null ? Number(o.discountAmount) : 0,
    discountLabel:
      o.discountAmount != null && Number(o.discountAmount) > 0 && !(o.discountPercent > 0)
        ? `₹${Number(o.discountAmount).toLocaleString('en-IN')}`
        : `${o.discountPercent ?? o.discount ?? 0}%`,
    expiresAt: o.expiresAt || o.endDate,
    expiresIn: days ?? undefined,
    terms: o.terms || o.conditions || '',
  };
}

export default function OffersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [viewingOffer, setViewingOffer] = useState<Offer | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [city, setCity] = useState('');
  const [claimedIds, setClaimedIds] = useState<string[]>([]);
  const [justClaimed, setJustClaimed] = useState<string | null>(null);

  useEffect(() => {
    setCity(getViewerCity());
  }, []);

  useEffect(() => {
    setClaimedIds(getClaimedOffers());
    setLoading(true);
    apiService
      .get<any>(`/v1/offers${city ? `?city=${encodeURIComponent(city)}` : ''}`)
      .then((res) => {
        if (res.data && !res.error) {
          const list = Array.isArray(res.data)
            ? res.data
            : res.data?.data ?? res.data?.items ?? [];
          const mapped = list.map(mapApiOffer);
          setOffers(mapped);
          const cats = [...new Set(mapped.map((o: Offer) => o.businessType).filter(Boolean))] as string[];
          setCategories(cats);
        }
      })
      .finally(() => setLoading(false));
  }, [city]);

  const handleCityChange = (v: string) => {
    const next = v === 'all' ? '' : v;
    setCity(next);
    setViewerCity(next);
  };

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return offers;
    return offers.filter((o) => o.businessType === typeFilter);
  }, [typeFilter, offers]);

  const handleClaim = async (offer: Offer) => {
    // Only logged-in users may claim — guests go to registration.
    if (!user) {
      router.push('/register?redirect=/offers');
      return;
    }
    // Server-side redemption is authoritative (JWT-guarded). Only mark claimed
    // locally when it actually succeeds.
    const res = await apiService.post<any>(`/v1/offers/${offer.id}/redeem`, {});
    if (res.status === 401) {
      router.push('/register?redirect=/offers');
      return;
    }
    if (res.error) return; // surfaced elsewhere; don't fake a claim
    const existing = getClaimedOffers();
    if (!existing.includes(offer.id)) {
      const updated = [...existing, offer.id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    setClaimedIds(getClaimedOffers());
    setJustClaimed(offer.id);
    setTimeout(() => setJustClaimed(null), 2500);
    if (viewingOffer?.id === offer.id) setViewingOffer(null);
  };

  const isClaimed = (id: string) => claimedIds.includes(id);

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

        {justClaimed && (
          <div className="fixed top-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-2xl shadow-2xl font-semibold text-sm animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="h-4 w-4" />
            Offer claimed successfully!
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-3">
          <Select value={city || 'all'} onValueChange={handleCityChange}>
            <SelectTrigger className="w-52 rounded-xl border-white/10">
              <SelectValue placeholder="Filter by city" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {KERALA_CITIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {categories.length > 0 && (
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-52 rounded-xl border-white/10">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 rounded-2xl text-center border-dashed border-white/10 bg-white/5">
            <Tag className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
            <h3 className="text-base font-semibold text-foreground mb-1">No Offers Available</h3>
            <p className="text-sm text-muted-foreground">Check back later for exclusive deals.</p>
          </Card>
        ) : (
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
                      {offer.business && (
                        <p className="text-sm text-muted-foreground">{offer.business}</p>
                      )}
                      {offer.businessType && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 mt-1 inline-block">
                          {offer.businessType}
                        </span>
                      )}
                    </div>
                    <div className={`px-3 py-1 rounded-lg font-bold text-lg ${claimed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary/10 text-primary'}`}>
                      {claimed ? <CheckCircle2 className="h-5 w-5" /> : offer.discountLabel}
                    </div>
                  </div>
                  {offer.description && (
                    <p className="text-sm mb-4 text-muted-foreground">{offer.description}</p>
                  )}
                  {offer.expiresIn != null && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                      <Calendar className="h-4 w-4" />
                      {offer.expiresIn === 0 ? 'Expires today' : `Expires in ${offer.expiresIn} days`}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setViewingOffer(offer)}
                      variant="outline"
                      className="flex-1 rounded-xl gap-1.5 border-white/10 text-slate-300 hover:bg-white/5 cursor-pointer"
                      size="sm"
                    >
                      <Eye className="h-4 w-4" /> View Details
                    </Button>
                    <ReportButton kind="offer" targetId={offer.id} targetName={offer.title} />
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
        )}

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
                  <p className="text-xs text-muted-foreground">
                    {[viewingOffer.business, viewingOffer.businessType].filter(Boolean).join(' • ')}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                  <p className="text-xs text-muted-foreground mb-1">Discount</p>
                  <p className="text-3xl font-extrabold text-foreground">{viewingOffer.discountLabel}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                  <p className="text-xs text-muted-foreground mb-1">Expires In</p>
                  <p className="text-3xl font-extrabold text-foreground">
                    {viewingOffer.expiresIn != null ? `${viewingOffer.expiresIn}d` : '—'}
                  </p>
                </div>
              </div>
              {viewingOffer.terms && (
                <div className="bg-white/5 p-4 rounded-xl border border-white/5 mb-6">
                  <p className="text-xs text-muted-foreground font-semibold mb-1">Terms & Conditions</p>
                  <p className="text-sm text-slate-300">{viewingOffer.terms}</p>
                </div>
              )}
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
