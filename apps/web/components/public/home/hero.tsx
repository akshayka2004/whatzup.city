'use client';

import { useI18n } from '@/lib/i18n/provider';

import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Map as MapIcon,
  MapPin,
  Search,
  Sparkles,
  Star,
  Store,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ResponsiveImage } from '@/components/common/responsive-image';
import { Skel, SkeletonRegion } from '@/components/common/skeletons';
import { KERALA_CITIES } from '@/lib/constants';
import { getCityIdentity } from '@/lib/city-identity';
import { discountText } from './home-data';

const TRENDING_CHIPS = ['Restaurants', 'Healthcare', 'Retail', 'Services'];

const CHIP =
  'hidden h-10 shrink-0 items-center rounded-full border border-border-strong/60 bg-card px-3.5 text-label text-foreground transition-colors hover:border-border-strong hover:bg-secondary sm:inline-flex';

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
  city,
  onCityChange,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  featuredBusiness,
  featuredOffer,
  announcement,
  panelLoading,
}: HeroProps) {
  const { t } = useI18n();
  const identity = getCityIdentity(city);
  const bizAvg = Number(featuredBusiness?.averageRating ?? featuredBusiness?.avgRating ?? 0);
  const bizReviews = Number(featuredBusiness?.totalReviews ?? featuredBusiness?.reviewCount ?? 0);
  const offerHref = featuredOffer?.business?.id
    ? `/business/${featuredOffer.business.id}#offers-section`
    : null;

  const offerCard = featuredOffer && (
    <div
      className="ui-fade-up rounded-xl border border-border bg-card p-4 shadow-md"
      style={{ animationDelay: '0.05s' }}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-primary/20 bg-primary/15 p-2">
          <Tag className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">
            {featuredOffer.business?.name || 'Featured offer'}
          </p>
          <p className="truncate text-sm font-bold text-foreground">
            {featuredOffer.title || featuredOffer.name}
          </p>
        </div>
        {featuredOffer.code ? (
          <span className="rounded-lg border border-primary/20 bg-brand-soft px-2 py-1 font-mono text-xs font-extrabold text-brand-soft-foreground">
            {featuredOffer.code}
          </span>
        ) : discountText(featuredOffer) ? (
          <span className="rounded-lg border border-primary/20 bg-brand-soft px-2 py-1 text-xs font-extrabold text-brand-soft-foreground">
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

      <div className="relative grid grid-cols-1 items-stretch lg:min-h-[400px] lg:grid-cols-12">
        <div className="flex flex-col justify-center gap-4 px-5 py-5 sm:gap-5 sm:px-8 sm:py-10 lg:col-span-7 lg:gap-6 lg:px-10 lg:py-12">
          {/* Phones skip the eyebrow so categories and the first offers are above the fold. */}
          <p className="hidden w-fit max-w-full items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-caption font-semibold text-brand-soft-foreground sm:inline-flex">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{identity.landmark}</span>
          </p>

          <div className="space-y-2.5">
            <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-foreground sm:text-display">
              {t('home.hero.lead')} <span className="text-primary">{city || 'Kerala'}</span>
              {t('home.hero.trail')}
            </h1>
            <p className="hidden max-w-md text-body text-muted-foreground sm:block">
              {t('home.hero.subtitle')}
            </p>
          </div>

          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              onSearch();
            }}
            className="flex max-w-xl items-center gap-1.5 rounded-full border border-border-strong/70 bg-background p-1.5 shadow-e1 transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30"
          >
            <Search className="ml-3 size-[18px] shrink-0 text-muted-foreground" aria-hidden />
            <input
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder={t('home.hero.placeholder')}
              aria-label="Search businesses"
              className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" shape="pill" className="h-10 shrink-0 px-5" aria-label="Search">
              <Search className="sm:hidden" />
              <span className="hidden sm:inline">{t('action.search')}</span>
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={city || 'all'} onValueChange={onCityChange}>
              <SelectTrigger
                aria-label="Your city"
                className="h-10 w-auto min-w-36 gap-1.5 rounded-full border-border-strong/60 bg-card text-sm"
              >
                <MapPin className="size-4 text-primary" aria-hidden />
                <SelectValue placeholder={t('home.allCities')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('home.allCities')}</SelectItem>
                {KERALA_CITIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link
              href="/search?open=1"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-success-soft px-3.5 text-label font-semibold text-success-soft-foreground transition-colors hover:bg-success/20"
            >
              <span className="ui-live-dot" aria-hidden /> Open now
            </Link>
            {TRENDING_CHIPS.map((cat) => (
              <Link key={cat} href={`/category?type=${cat.toLowerCase()}`} className={CHIP}>
                {cat}
              </Link>
            ))}
          </div>
        </div>

        {/* Right panel — live data (desktop) */}
        <div className="relative hidden items-center justify-center overflow-hidden border-l border-border bg-secondary/60 p-8 lg:col-span-5 lg:flex">
          {panelLoading ? (
            <SkeletonRegion
              label="Loading featured content"
              className="relative w-full max-w-xs space-y-4"
            >
              <Skel className="h-[104px] w-full rounded-xl" />
              <Skel className="h-[72px] w-full rounded-xl" />
              <Skel className="h-[56px] w-full rounded-xl" />
            </SkeletonRegion>
          ) : (
            <div className="relative w-full max-w-sm space-y-4">
              <p className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
                Live on Whtzup
              </p>
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
                          <h4 className="truncate text-sm font-bold text-foreground">
                            {featuredBusiness.name}
                          </h4>
                          {featuredBusiness.isVerified && (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {featuredBusiness.category?.name ||
                            featuredBusiness.description ||
                            'Verified business'}
                        </p>
                        {bizReviews > 0 && bizAvg > 0 ? (
                          <div className="mt-2 flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-warning text-warning-soft-foreground" />
                            <span className="text-xs font-bold text-foreground">
                              {bizAvg.toFixed(1)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({bizReviews} {bizReviews === 1 ? 'review' : 'reviews'})
                            </span>
                          </div>
                        ) : (
                          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-highlight-soft px-2 py-0.5 text-xs font-semibold text-highlight-soft-foreground">
                            <Sparkles className="h-3 w-3" /> New on Whtzup
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {offerCard &&
                (offerHref ? (
                  <Link href={offerHref} className="block">
                    {offerCard}
                  </Link>
                ) : (
                  offerCard
                ))}

              {announcement && (
                <div
                  className="ui-fade-up rounded-xl border border-border bg-card p-3 shadow-md"
                  style={{ animationDelay: '0.1s' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-primary">
                        Civic Notice
                      </p>
                      <p className="truncate text-xs font-semibold text-foreground">
                        {announcement.title}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Map teaser: always useful, and it anchors the panel when there is little live data. */}
              <Link
                href="/search?view=map"
                className="ui-fade-up ui-press group relative block overflow-hidden rounded-xl border border-border bg-card shadow-md transition-colors hover:border-primary/40"
                style={{ animationDelay: '0.15s' }}
              >
                <div
                  aria-hidden
                  className="h-20 w-full"
                  style={{
                    backgroundColor: 'color-mix(in oklch, var(--card) 90%, var(--primary))',
                    backgroundImage:
                      'linear-gradient(115deg, transparent 46%, color-mix(in oklch, var(--primary) 18%, transparent) 47%, color-mix(in oklch, var(--primary) 18%, transparent) 49%, transparent 50%), linear-gradient(25deg, transparent 60%, color-mix(in oklch, var(--highlight) 22%, transparent) 61%, color-mix(in oklch, var(--highlight) 22%, transparent) 63%, transparent 64%), radial-gradient(color-mix(in oklch, var(--primary) 25%, transparent) 1px, transparent 1.5px)',
                    backgroundSize: 'auto, auto, 12px 12px',
                  }}
                >
                  <MapPin className="absolute left-[30%] top-5 h-5 w-5 fill-primary text-primary-foreground" />
                  <MapPin className="absolute left-[58%] top-8 h-5 w-5 fill-highlight text-primary-foreground" />
                  <MapPin className="absolute left-[78%] top-3 h-5 w-5 fill-primary text-primary-foreground" />
                </div>
                <div className="flex items-center justify-between gap-3 p-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <MapIcon className="h-4 w-4 text-primary" /> Explore places on the map
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
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
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Civic Notice</p>
        <p className="truncate text-xs font-semibold text-foreground">{announcement.title}</p>
      </div>
    </div>
  );
}
