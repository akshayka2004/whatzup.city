'use client';

import { ModalSurface } from '@/components/system/modal-surface';
import { useState, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Button } from '@/components/ui/button';
import { Tag, X, CheckCircle2, Sparkles, Phone, QrCode, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/system/page-header';
import { Modal } from '@/components/system/modal';
import { toast } from '@/components/ui/sonner';
import { extractBusinessIdFromScan } from '@/lib/qr';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiService } from '@/lib/services/api-service';
import { KERALA_CITIES, getViewerCity, setViewerCity } from '@/lib/constants';
import { deliverySummary, rateLines } from '@/lib/platform-offers';
import { getVisitorId } from '@/lib/visitor-id';
import { EmptyState } from '@/components/common/empty-state';
import {
  applyOfferView,
  buildOffers,
  CLAIMED_STORAGE_KEY,
  getClaimedOffers,
  listFrom,
  mapPlatformOffer,
  platformHasImages,
  type Offer,
  type OfferChip,
  type OfferSort,
} from '@/components/public/offers/offer-model';
import { OfferCoupon } from '@/components/public/offers/offer-coupon';
import { OfferFilterChips, SORT_OPTIONS } from '@/components/public/offers/offer-filters';
import { CouponGridSkeleton } from '@/components/public/offers/skeletons';
import { StaggerGrid } from '@/components/public/offers/stagger-grid';

// The camera scanner (qr-scanner) is heavy and only needed after a tap on "Scan QR".
const QrScanModal = dynamic(
  () => import('@/components/business/qr-scan-modal').then((m) => m.QrScanModal),
  { ssr: false },
);

export interface OffersClientProps {
  /** Raw `/v1/offers` body from the server render of the default (all-cities) view, or null. */
  initialOffers?: unknown | null;
  /** Raw `/v1/platform-offers/public` body from the server render, or null. */
  initialPlatformOffers?: unknown | null;
}

export default function OffersClient({ initialOffers = null, initialPlatformOffers = null }: OffersClientProps) {
  const router = useRouter();
  const { user } = useAuth();

  // Server data only counts when BOTH requests succeeded; otherwise this page
  // fetches in the browser exactly as it always did.
  const seeded = initialOffers != null && initialPlatformOffers != null;
  const seedPending = useRef(seeded);

  const [offers, setOffers] = useState<Offer[]>(() => (seeded ? buildOffers(initialOffers, initialPlatformOffers, true) : []));
  const [loading, setLoading] = useState(!seeded);
  const [viewingOffer, setViewingOffer] = useState<Offer | null>(null);
  // Filters live in the URL so a filtered view can be shared or survives a reload.
  const sp = useSearchParams();
  const pathname = usePathname();
  const typeFilter = sp.get('type') || 'all';
  const chip = (sp.get('chip') as OfferChip) || 'all';
  const sort = (sp.get('sort') as OfferSort) || 'featured';
  const setParam = (key: string, value: string, fallback: string) => {
    const next = new URLSearchParams(sp.toString());
    if (!value || value === fallback) next.delete(key);
    else next.set(key, value);
    router.replace(`${pathname}${next.toString() ? `?${next}` : ''}`, { scroll: false });
  };
  const setTypeFilter = (v: string) => setParam('type', v, 'all');
  const setChip = (v: OfferChip) => setParam('chip', v, 'all');
  const setSort = (v: OfferSort) => setParam('sort', v, 'featured');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [city, setCity] = useState('');
  const [claimedIds, setClaimedIds] = useState<string[]>([]);
  const [justClaimed, setJustClaimed] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanMounted, setScanMounted] = useState(false);
  const [scanError, setScanError] = useState('');

  useEffect(() => {
    setCity(getViewerCity());
  }, []);

  useEffect(() => {
    setClaimedIds(getClaimedOffers());

    // First run with server-rendered data and no city: that IS the default view.
    if (seedPending.current && !city) {
      seedPending.current = false;
      if (getViewerCity()) {
        // A city is stored — the effect above is about to apply it and re-run this
        // one with it, which fetches that city's offers. Don't flash the default list.
        setLoading(true);
        return;
      }
      setLoading(false);
      // Platform image URLs are signed for ~60s, so server-rendered ones are
      // withheld. Quietly fetch fresh platform offers (no spinner) to fill them in.
      if (platformHasImages(initialPlatformOffers)) {
        let alive = true;
        apiService.get<any>('/v1/platform-offers/public').then((res) => {
          if (!alive || res.error || !res.data) return;
          const fresh = listFrom(res.data, ['data']).map((o) => mapPlatformOffer(o));
          setOffers((prev) => [...fresh, ...prev.filter((o) => !o.isPlatform)]);
        });
        return () => {
          alive = false;
        };
      }
      return;
    }
    seedPending.current = false;

    let cancelled = false;
    setLoading(true);

    // Business offers and platform-curated offers are shown together. Platform
    // offers are fetched separately because they have no Business relation.
    Promise.allSettled([
      apiService.get<any>(`/v1/offers${city ? `?city=${encodeURIComponent(city)}` : ''}`),
      apiService.get<any>('/v1/platform-offers/public'),
    ])
      .then(([offersRes, platformRes]) => {
        if (cancelled) return;
        const offersBody =
          offersRes.status === 'fulfilled' && offersRes.value.data && !offersRes.value.error ? offersRes.value.data : null;
        const platformBody =
          platformRes.status === 'fulfilled' && platformRes.value.data && !platformRes.value.error ? platformRes.value.data : null;
        setOffers(buildOffers(offersBody, platformBody));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  const handleCityChange = (v: string) => {
    const next = v === 'all' ? '' : v;
    setCity(next);
    setViewerCity(next);
  };

  const categories = useMemo(
    () => [...new Set(offers.map((o) => o.businessType).filter(Boolean))] as string[],
    [offers],
  );

  const filtered = useMemo(
    () => applyOfferView(offers, { city, type: typeFilter, chip, sort }),
    [typeFilter, city, offers, chip, sort],
  );

  const filtersActive = chip !== 'all' || typeFilter !== 'all';
  const resetFilters = () => router.replace(pathname, { scroll: false });

  const openOffer = (offer: Offer) => {
    setViewingOffer(offer);
    // Fire-and-forget click tracking — deduped server-side per visitor/day.
    const actorKey = user?.id || getVisitorId();
    const endpoint = offer.isPlatform ? `/v1/platform-offers/${offer.id}/click` : `/v1/offers/${offer.id}/click`;
    apiService.post<any>(endpoint, { actorKey }).catch(() => {});
  };

  const handleClaim = async (offer: Offer) => {
    // Only logged-in users may claim — guests go to registration.
    if (!user) {
      router.push('/login?redirect=%2Foffers');
      return;
    }
    // Server-side redemption is authoritative (JWT-guarded). Only mark claimed
    // locally when it actually succeeds.
    const res = await apiService.post<any>(`/v1/offers/${offer.id}/redeem`, {});
    if (res.status === 401) {
      router.push('/login?redirect=%2Foffers');
      return;
    }
    if (res.error) {
      toast.error(res.error);
      return;
    }
    const existing = getClaimedOffers();
    if (!existing.includes(offer.id)) {
      const updated = [...existing, offer.id];
      localStorage.setItem(CLAIMED_STORAGE_KEY, JSON.stringify(updated));
    }
    setClaimedIds(getClaimedOffers());
    toast.success('Offer claimed — show it at the counter.');
    setJustClaimed(offer.id);
    setTimeout(() => setJustClaimed(null), 2500);
    if (viewingOffer?.id === offer.id) setViewingOffer(null);
  };

  const isClaimed = (id: string) => claimedIds.includes(id);

  const handleQrScan = (decodedText: string) => {
    const businessId = extractBusinessIdFromScan(decodedText);
    if (!businessId) {
      setScanError("That code isn't a whtzup.city business QR.");
      return;
    }
    setScanOpen(false);
    router.push(`/business/${businessId}?src=qr#offers-section`);
  };

  return (
    <PublicLayout>
      <div>
        <PageHeader
          title="Offers"
          description="Live deals from businesses near you."
          className="mb-4 sm:mb-5"
          actions={
          <div className="flex flex-wrap items-center gap-2">
            {claimedIds.length > 0 && (
              <div
                // key restarts the pop each time the count changes
                key={claimedIds.length}
                className="ui-pop flex items-center gap-1.5 rounded-full border border-success/25 bg-success/12 px-3 py-2 text-xs font-semibold text-success"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {claimedIds.length} claimed
              </div>
            )}
            <Button
              onClick={() => {
                setScanError('');
                setScanMounted(true);
                setScanOpen(true);
              }}
              variant="outline"
              size="sm"
              className="ui-press h-11 cursor-pointer gap-1.5 rounded-xl"
            >
              <QrCode className="h-4 w-4" /> Scan QR
            </Button>
          </div>
          }
        />
        {scanError && (
          <p className="-mt-2 mb-4 text-xs text-destructive">{scanError}</p>
        )}


        <div className="mb-3">
          <OfferFilterChips value={chip} onChange={setChip} />
        </div>

        <div className="mb-5 sm:hidden">
          <Button variant="outline" className="w-full justify-between" onClick={() => setFiltersOpen(true)}>
            <span className="flex items-center gap-2">
              <SlidersHorizontal /> Filters & sort
            </span>
            <span className="truncate text-caption text-muted-foreground">
              {[city || 'All cities', typeFilter !== 'all' ? typeFilter : null, SORT_OPTIONS.find((o) => o.value === sort)?.label].filter(Boolean).join(' · ')}
            </span>
          </Button>
        </div>
        <Modal
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          title="Filters & sort"
          footer={
            <Button size="lg" onClick={() => setFiltersOpen(false)}>
              Show {filtered.length} {filtered.length === 1 ? 'offer' : 'offers'}
            </Button>
          }
        >
          <div className="grid gap-4 pb-2">
            {[
              ['City', city || 'all', handleCityChange, [['all', 'All cities'], ...KERALA_CITIES.map((c) => [c, c])]],
              ...(categories.length ? [['Category', typeFilter, setTypeFilter, [['all', 'All categories'], ...categories.map((c) => [c, c])]]] : []),
              ['Sort by', sort, (v: string) => setSort(v as OfferSort), SORT_OPTIONS.map((o) => [o.value, o.label])],
            ].map(([label, value, onChange, opts]: any) => (
              <div key={label} className="space-y-1.5">
                <span className="text-label">{label}</span>
                <Select value={value} onValueChange={onChange}>
                  <SelectTrigger aria-label={label} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {opts.map(([v, l]: [string, string]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </Modal>
        <div className="mb-5 hidden gap-3 sm:flex sm:flex-wrap">
          <Select value={city || 'all'} onValueChange={handleCityChange}>
            <SelectTrigger className="w-full rounded-xl data-[size=default]:h-11 sm:w-52">
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
              <SelectTrigger className="w-full rounded-xl data-[size=default]:h-11 sm:w-52">
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
          <Select value={sort} onValueChange={(v) => setSort(v as OfferSort)}>
            <SelectTrigger aria-label="Sort offers" className="w-full rounded-xl data-[size=default]:h-11 sm:w-52">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <CouponGridSkeleton count={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No offers available"
            description={filtersActive ? 'No offers match these filters yet.' : 'Check back later for exclusive deals.'}
            action={filtersActive ? { label: 'Show all offers', onClick: resetFilters } : undefined}
          />
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
              {filtered.length} {filtered.length === 1 ? 'offer' : 'offers'}
            </p>
            <StaggerGrid className="grid grid-cols-1 md:grid-cols-2" gap={4}>
              {filtered.map((offer) => (
                <OfferCoupon
                  key={offer.id}
                  offer={offer}
                  claimed={isClaimed(offer.id)}
                  justClaimed={justClaimed === offer.id}
                  onView={openOffer}
                  onClaim={handleClaim}
                />
              ))}
            </StaggerGrid>
          </>
        )}

        {viewingOffer && (
          <ModalSurface onClose={() => setViewingOffer(null)} label="Offer details" className="sm:max-w-md" hideClose>
              <button
                onClick={() => setViewingOffer(null)}
                aria-label="Close"
                className="absolute top-3 right-3 p-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
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
              {/* Platform offers have a price and no expiry; business offers
                  have a discount and a countdown. */}
              {viewingOffer.isPlatform ? (
                <div className="mb-6 space-y-3">
                  {(() => {
                    const rates = rateLines(viewingOffer.category || '', viewingOffer.subType, viewingOffer.details);
                    if (rates.length) {
                      return (
                        <div className="bg-secondary p-4 rounded-xl border border-border space-y-1.5">
                          <p className="text-xs text-muted-foreground mb-1">Rates</p>
                          {rates.map((r, i) => (
                            <div key={i} className="grid grid-cols-3 gap-2 text-sm">
                              <span className="text-muted-foreground">{r.label}</span>
                              <span className="col-span-2 text-foreground font-semibold">{r.rate}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    if (!viewingOffer.discountLabel) return null;
                    return (
                      <div className="bg-secondary p-4 rounded-xl text-center border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Price</p>
                        <p className="text-2xl font-extrabold text-primary">{viewingOffer.discountLabel}</p>
                      </div>
                    );
                  })()}
                  {(() => {
                    const d = viewingOffer.details || {};
                    const rows: { label: string; value: string }[] = [];
                    if (d.providerType) rows.push({ label: 'Type', value: d.providerType });
                    if (d.availableTiming) rows.push({ label: 'Available', value: d.availableTiming });
                    if (d.hasPreBooking && d.preBookingPackage) {
                      rows.push({ label: 'Package', value: d.preBookingPackage });
                    }
                    if (d.hasPreBooking && d.sadhyaTiming) {
                      rows.push({ label: 'Sadhya timing', value: d.sadhyaTiming });
                    }
                    const delivery = deliverySummary(d);
                    if (delivery.length) rows.push({ label: 'Options', value: delivery.join(' · ') });
                    if (d.propertyTypes?.length) rows.push({ label: 'Property', value: d.propertyTypes.join(', ') });
                    if (d.views?.length) rows.push({ label: 'View', value: d.views.join(', ') });
                    if (d.venueTypes?.length) rows.push({ label: 'Venue', value: d.venueTypes.join(', ') });
                    if (d.minTeamCount) rows.push({ label: 'Min team', value: d.minTeamCount });
                    if (d.time) rows.push({ label: 'Time', value: d.time });
                    if (d.minPax || d.maxPax) {
                      rows.push({ label: 'Pax', value: [d.minPax, d.maxPax].filter(Boolean).join(' – ') });
                    }
                    if (d.acStatus) rows.push({ label: 'AC', value: d.acStatus });
                    if (d.amenities) rows.push({ label: 'Amenities', value: d.amenities });
                    if (d.brandOrCategory) rows.push({ label: 'Brand', value: d.brandOrCategory });
                    if (viewingOffer.phone) rows.push({ label: 'Phone', value: viewingOffer.phone });
                    if (!rows.length) return null;
                    return (
                      <div className="bg-secondary p-4 rounded-xl border border-border space-y-1.5">
                        {rows.map((r) => (
                          <div key={r.label} className="grid grid-cols-3 gap-2 text-sm">
                            <span className="text-muted-foreground">{r.label}</span>
                            <span className="col-span-2 text-foreground">{r.value}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ) : (
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
              )}
              {viewingOffer.terms && (
                <div className="bg-secondary p-4 rounded-xl border border-border mb-6">
                  <p className="text-xs text-muted-foreground font-semibold mb-1">Terms & conditions</p>
                  <p className="text-sm text-foreground">{viewingOffer.terms}</p>
                </div>
              )}
              {viewingOffer.isPlatform ? (
                // Nothing to redeem — the customer deals with the vendor directly.
                <div className="flex gap-3">
                  <Button onClick={() => setViewingOffer(null)} variant="outline" className="h-11 flex-1">
                    Close
                  </Button>
                  {viewingOffer.phone && (
                    <a href={`tel:${viewingOffer.phone}`} className="flex-1">
                      <Button className="h-11 w-full gap-1.5">
                        <Phone className="h-4 w-4" /> Call vendor
                      </Button>
                    </a>
                  )}
                </div>
              ) : isClaimed(viewingOffer.id) ? (
                <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-success/12 border border-success/25 text-success font-semibold py-3">
                  <CheckCircle2 className="h-5 w-5" /> Already claimed
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button onClick={() => setViewingOffer(null)} variant="outline" className="h-11 flex-1">
                    Close
                  </Button>
                  <Button onClick={() => handleClaim(viewingOffer)} className="h-11 flex-1 gap-1.5">
                    <Sparkles className="h-4 w-4" /> Claim offer
                  </Button>
                </div>
              )}
          </ModalSurface>
        )}

        {scanMounted && (
          <QrScanModal open={scanOpen} onClose={() => setScanOpen(false)} onScan={handleQrScan} />
        )}
      </div>
    </PublicLayout>
  );
}
