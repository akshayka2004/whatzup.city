'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
            <h1 className="text-3xl font-bold tracking-tight mb-1">Exclusive Offers</h1>
            <p className="text-muted-foreground">Find the best deals from businesses near you</p>
          </div>
          {claimedIds.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/12 border border-success/25 text-success text-xs font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {claimedIds.length} claimed
            </div>
          )}
        </div>

        {justClaimed && (
          <div
            role="status"
            className="fixed top-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 bg-success text-success-foreground rounded-2xl shadow-2xl font-semibold text-sm animate-in fade-in slide-in-from-top-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Offer claimed successfully!
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-3">
          <Select value={city || 'all'} onValueChange={handleCityChange}>
            <SelectTrigger className="w-52 rounded-xl">
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
              <SelectTrigger className="w-52 rounded-xl">
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
          <div className="p-12 rounded-2xl text-center border border-dashed border-border bg-secondary">
            <Tag className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
            <h3 className="text-base font-semibold text-foreground mb-1">No offers available</h3>
            <p className="text-sm text-muted-foreground">Check back later for exclusive deals.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {filtered.map((offer) => {
              const claimed = isClaimed(offer.id);
              const urgent = offer.expiresIn != null && offer.expiresIn <= 3;
              return (
                <div
                  key={offer.id}
                  className={cn(
                    'flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl motion-reduce:hover:translate-y-0',
                    claimed && 'opacity-75',
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{offer.title}</h3>
                      {offer.business && (
                        <p className="text-sm text-muted-foreground truncate">{offer.business}</p>
                      )}
                      {offer.businessType && (
                        <span className="mt-1 inline-block rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {offer.businessType}
                        </span>
                      )}
                    </div>
                    <div
                      className={cn(
                        'shrink-0 rounded-xl px-3 py-1 text-lg font-bold',
                        claimed ? 'bg-success/12 text-success' : 'bg-primary/10 text-primary',
                      )}
                    >
                      {claimed ? <CheckCircle2 className="h-5 w-5" /> : offer.discountLabel}
                    </div>
                  </div>
                  {offer.description && (
                    <p className="mb-4 text-sm text-muted-foreground line-clamp-2">{offer.description}</p>
                  )}
                  {offer.expiresIn != null && (
                    <div
                      className={cn(
                        'mb-4 flex items-center gap-2 text-xs',
                        urgent ? 'text-warning font-medium' : 'text-muted-foreground',
                      )}
                    >
                      <Calendar className="h-4 w-4" />
                      {offer.expiresIn === 0 ? 'Expires today' : `Expires in ${offer.expiresIn} days`}
                    </div>
                  )}
                  <div className="mt-auto flex gap-2">
                    <Button
                      onClick={() => setViewingOffer(offer)}
                      variant="outline"
                      className="flex-1 gap-1.5"
                      size="sm"
                    >
                      <Eye className="h-4 w-4" /> View details
                    </Button>
                    <ReportButton kind="offer" targetId={offer.id} targetName={offer.title} />
                    {claimed ? (
                      <div className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-success/12 border border-success/25 text-success text-sm font-semibold px-3">
                        <CheckCircle2 className="h-4 w-4" /> Claimed
                      </div>
                    ) : (
                      <Button onClick={() => handleClaim(offer)} className="flex-1 gap-1.5" size="sm">
                        <Sparkles className="h-4 w-4" /> Claim offer
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewingOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md p-6 rounded-2xl border border-border bg-card shadow-2xl">
              <button
                onClick={() => setViewingOffer(null)}
                aria-label="Close"
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
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
                <div className="bg-secondary p-4 rounded-xl text-center border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Discount</p>
                  <p className="text-3xl font-extrabold text-primary">{viewingOffer.discountLabel}</p>
                </div>
                <div className="bg-secondary p-4 rounded-xl text-center border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Expires in</p>
                  <p className="text-3xl font-extrabold text-foreground tabular-nums">
                    {viewingOffer.expiresIn != null ? `${viewingOffer.expiresIn}d` : '—'}
                  </p>
                </div>
              </div>
              {viewingOffer.terms && (
                <div className="bg-secondary p-4 rounded-xl border border-border mb-6">
                  <p className="text-xs text-muted-foreground font-semibold mb-1">Terms & conditions</p>
                  <p className="text-sm text-foreground">{viewingOffer.terms}</p>
                </div>
              )}
              {isClaimed(viewingOffer.id) ? (
                <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-success/12 border border-success/25 text-success font-semibold py-3">
                  <CheckCircle2 className="h-5 w-5" /> Already claimed
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button onClick={() => setViewingOffer(null)} variant="outline" className="flex-1">
                    Close
                  </Button>
                  <Button onClick={() => handleClaim(viewingOffer)} className="flex-1 gap-1.5">
                    <Sparkles className="h-4 w-4" /> Claim offer
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
