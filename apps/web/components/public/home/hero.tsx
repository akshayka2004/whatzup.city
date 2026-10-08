'use client';

import Link from 'next/link';
import { CheckCircle2, MapPin, Search, Star, Store, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ResponsiveImage } from '@/components/common/responsive-image';
import { StatusPill } from '@/components/common/status-pill';
import { Skel, SkeletonRegion } from '@/components/common/skeletons';
import { KERALA_CITIES } from '@/lib/constants';
import { getCityIdentity } from '@/lib/city-identity';
import { discountText } from './home-data';

const TRENDING_CHIPS = ['Restaurants', 'Healthcare', 'Retail', 'Services'];

const CHIP =
  'inline-flex min-h-11 shrink-0 items-center rounded-xl border border-border bg-secondary px-3.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground ui-press sm:min-h-9 sm:px-3';

export type HeroProps = {
  city: string;
  onCityChange: (value: string) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  featuredBusiness: any;
  featuredOffer: any;
  announcement: any;
  panelLoading: boolean;
};

export function HomeHero({
  city, onCityChange, searchQuery, onSearchQueryChange, onSearch,
  featuredBusiness, featuredOffer, announcement, panelLoading,
}: HeroProps) {
  const identity = getCityIdentity(city);
  const bizAvg = Number(featuredBusiness?.averageRating ?? featuredBusiness?.avgRating ?? 0);
  const bizReviews = Number(featuredBusiness?.totalReviews ?? featuredBusiness?.reviewCount ?? 0);
  const offerHref = featuredOffer?.business?.id ? `/business/${featuredOffer.business.id}#offers-section` : null;

  const offerCard = featuredOffer && (
    <div className="ui-fade-up rounded-xl border border-border bg-card p-4 shadow-md" style={{ animationDelay: '0.05s' }}>
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-primary/20 bg-primary/15 p-2">
          <Tag className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{featuredOffer.business?.name || 'Featured offer'}</p>
          <p className="truncate text-sm font-bold text-foreground">{featuredOffer.title || featuredOffer.name}</p>
        </div>
        {featuredOffer.code ? (
          <span className="rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 font-mono text-[10px] font-extrabold text-primary">
            {featuredOffer.code}
          </span>
        ) : discountText(featuredOffer) ? (
          <span className="rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-extrabold text-primary">
            {discountText(featuredOffer)}
          </span>
        ) : null}
      </div>
    </div>
  );

  return (
    <section className="relative mb-6 overflow-hidden rounded-3xl border border-border bg-card md:mb-14">
      {/* City-tinted atmosphere — hue shifts with the selected city */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-[background] duration-700"
        style={{
          background: `radial-gradient(120% 120% at 100% 0%, oklch(0.62 0.10 ${identity.hue} / 0.14), transparent 55%), linear-gradient(135deg, oklch(0.62 0.10 ${identity.hue} / 0.06), transparent 60%)`,
        }}
      />
      {/* Slow decorative drift (transform only, still under reduced motion) */}
      <div aria-hidden className="ui-drift pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div aria-hidden className="ui-drift-slow pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative grid grid-cols-1 items-stretch gap-6 lg:min-h-[440px] lg:grid-cols-12 lg:gap-0">
        <div className="ui-stagger flex flex-col justify-center space-y-5 px-5 py-8 sm:px-6 sm:py-10 lg:col-span-7 lg:space-y-6 lg:px-10 lg:py-14">
          <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{identity.landmark}</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-balance text-4xl font-black leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem]">
              Stronger Communities,<br />
              <span className="ui-text-shine">Smarter Connections.</span>
            </h1>
            <p className="max-w-md text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
              Discover trusted businesses, government services, offers, events, and
              announcements from across {city || 'Kerala'} — all in one place.
            </p>
          </div>

          <div className="flex max-w-lg flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                placeholder="Restaurants, doctors, shops…"
                aria-label="Search businesses"
                className="h-11 rounded-xl border-border bg-background pl-10 text-sm focus:border-primary"
              />
            </div>
            <Button
              onClick={onSearch}
              className="ui-press h-11 shrink-0 cursor-pointer rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Search
            </Button>
          </div>

          <div className="flex max-w-lg items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Your city:
            </span>
            <Select value={city || 'all'} onValueChange={onCityChange}>
              <SelectTrigger className="h-11 min-w-0 flex-1 rounded-xl border-border bg-background text-sm sm:h-9 sm:w-48 sm:flex-none">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {KERALA_CITIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="ui-scroll-x flex items-center gap-2 pb-1 sm:flex-wrap sm:pb-0 sm:overflow-visible! sm:mx-0! sm:px-0!">
            <Link
              href="/search?open=1"
              className="ui-press inline-flex min-h-11 shrink-0 items-center rounded-full sm:min-h-9"
            >
              <StatusPill live tone="success" label="Open now near you" className="px-3.5 py-1.5 text-xs" />
            </Link>
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Trending:
            </span>
            {TRENDING_CHIPS.map((cat) => (
              <Link key={cat} href={`/category?type=${cat.toLowerCase()}`} className={CHIP}>
                {cat}
              </Link>
            ))}
          </div>
        </div>

        {/* Right panel — live data (desktop) */}
        <div className="relative hidden items-center justify-center overflow-hidden border-l border-border bg-secondary/60 p-8 lg:col-span-5 lg:flex">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />

          {panelLoading ? (
            <SkeletonRegion label="Loading featured content" className="relative w-full max-w-xs space-y-4">
              <Skel className="h-[104px] w-full rounded-xl" />
              <Skel className="h-[72px] w-full rounded-xl" />
              <Skel className="h-[56px] w-full rounded-xl" />
            </SkeletonRegion>
          ) : (
            <div className="relative w-full max-w-xs space-y-4">
              {featuredBusiness && (
                <Link href={`/business/${featuredBusiness.id}`} className="ui-fade-up block">
                  <div className="ui-lift ui-press cursor-pointer rounded-xl border border-border bg-card p-4 shadow-md transition-colors hover:border-primary/40">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-primary/20 bg-primary/15">
                        <ResponsiveImage
                          src={featuredBusiness.logo}
                          alt=""
                          ratio="1"
                          sizes="48px"
                          fallback={<Store className="h-5 w-5 text-primary" />}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-1.5">
                          <h4 className="truncate text-sm font-bold text-foreground">{featuredBusiness.name}</h4>
                          {featuredBusiness.isVerified && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {featuredBusiness.category?.name || featuredBusiness.description || 'Verified business'}
                        </p>
                        <div className="mt-2 flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                          <span className="text-xs font-bold text-foreground">{bizAvg > 0 ? bizAvg.toFixed(1) : '—'}</span>
                          <span className="text-xs text-muted-foreground">({bizReviews} reviews)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {offerCard && (offerHref ? <Link href={offerHref} className="block">{offerCard}</Link> : offerCard)}

              {announcement && (
                <div className="ui-fade-up rounded-xl border border-border bg-card p-3 shadow-md" style={{ animationDelay: '0.1s' }}>
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Civic Notice</p>
                      <p className="truncate text-xs font-semibold text-foreground">{announcement.title}</p>
                    </div>
                  </div>
                </div>
              )}

              {!featuredBusiness && !featuredOffer && !announcement && (
                <div className="rounded-xl border border-dashed border-border bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground">No featured content yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** Civic notice for screens where the hero's side panel is hidden. */
export function MobileNotice({ announcement }: { announcement: any }) {
  if (!announcement?.title) return null;
  return (
    <div className="ui-fade-up mb-8 flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 lg:hidden">
      <div className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Civic Notice</p>
        <p className="truncate text-xs font-semibold text-foreground">{announcement.title}</p>
      </div>
    </div>
  );
}
