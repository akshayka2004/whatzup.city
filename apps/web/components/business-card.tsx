'use client';

import { useI18n } from '@/lib/i18n/provider';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getOpenStatus, hasOperatingHours } from '@saas/types';
import {
  BadgeCheck,
  Globe,
  Heart,
  Instagram,
  MapPin,
  Navigation,
  Star,
  Store,
  TicketPercent,
} from 'lucide-react';
import { ReportButton } from './report-button';
import { VerifiedBadge } from './common/verified-badge';
import { ResponsiveImage } from './common/responsive-image';
import { formatDistance } from './public/search/geo';
import { isFavorite, toggleFavorite, FAVORITES_EVENT } from '@/lib/favorites';
import { track } from '@/lib/analytics/track';
import { useImpression } from '@/lib/analytics/use-impression';
import { cn } from '@/lib/utils';

const SOURCE_BY_PATH: [RegExp, string][] = [
  [/^\/$/, 'home'],
  [/^\/search/, 'search'],
  [/^\/category/, 'category'],
  [/^\/nearby/, 'nearby'],
  [/^\/favorites/, 'favorites'],
  [/^\/business\//, 'related'],
];

/**
 * Public business card (home strips, search, browse, nearby, related).
 *
 * The whole card is one link (stretched over the card); the heart and the
 * report flag sit above it as separate controls. Media shows the logo on a
 * soft tint with category, open status, distance and live-offer chips; the
 * body keeps to name + trust marks, one context line and the rating.
 */
export function BusinessCard({
  business,
  distanceKm,
  className,
  priority = false,
  showLinks = false,
}: {
  business: any;
  /** Shown as a "1.2 km" chip on the media (Nearby). */
  distanceKm?: number | null;
  className?: string;
  /** Eager-load the media (first row of a long list). */
  priority?: boolean;
  /** Also show the street address and Instagram / website links (Search results). */
  showLinks?: boolean;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const isFood = /food|restaurant|cafe|bakery|hotel/i.test(
    business.category?.slug || business.category?.name || '',
  );
  const rating = business.avgRating ?? business.averageRating;
  const ratingNum = rating != null && rating !== '' ? Number(rating) : null;
  const reviews = Number(business.reviewCount ?? business.totalReviews ?? 0) || 0;
  const logo: string | undefined = business.logo || undefined;
  const categoryName: string = business.category?.name || business.categoryName || '';
  const offerCount = Number(business.activeOfferCount ?? business.offerCount ?? 0) || 0;
  const brandName: string = business.brand?.name || '';
  const outlet: string = business.outletLabel || '';
  const initial = (business.name || 'B').charAt(0).toUpperCase();
  const href = `/business/${business.id}`;

  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setSaved(isFavorite(business.id));
    const sync = () => setSaved(isFavorite(business.id));
    window.addEventListener(FAVORITES_EVENT, sync);
    return () => window.removeEventListener(FAVORITES_EVENT, sync);
  }, [business.id]);

  // Open/closed depends on "now": computed after mount to avoid a hydration mismatch.
  const hasHours = hasOperatingHours(business.operatingHours);
  const [status, setStatus] = useState<{ isOpen: boolean; label: string } | null>(null);
  useEffect(() => {
    setStatus(hasHours ? getOpenStatus(business.operatingHours, new Date()) : null);
  }, [hasHours, business.operatingHours]);

  const onBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = toggleFavorite(business);
    setSaved(next);
    if (next) track('SAVE', { businessId: business.id });
  };

  const onOpen = () => {
    const source = SOURCE_BY_PATH.find(([re]) => re.test(pathname || ''))?.[1] ?? 'other';
    track('CARD_CLICK', { businessId: business.id, source });
  };

  const context =
    brandName || outlet
      ? brandName && outlet
        ? `${brandName} · ${outlet}`
        : brandName || outlet
      : business.city || '';

  const address = showLinks
    ? [business.address, business.city, business.state].filter(Boolean).join(', ')
    : '';
  const instagram: string | undefined = showLinks ? business.socialLinks?.instagram : undefined;
  const website: string | undefined = showLinks ? business.website : undefined;
  const impressionRef = useImpression<HTMLElement>(business.id);

  return (
    <article
      ref={impressionRef}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-card border border-border/70 bg-card shadow-e1 transition-[box-shadow,border-color,transform] duration-200 ease-out-quint hover:border-border-strong hover:shadow-e2 focus-within:border-border-strong active:scale-[0.99] motion-reduce:active:scale-100',
        className,
      )}
    >
      {/* Media */}
      <div className="relative">
        <ResponsiveImage
          src={logo}
          alt=""
          ratio="2 / 1"
          priority={priority}
          className="bg-brand-soft"
          imgClassName="!object-contain p-6 transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          fallback={
            <span className="flex size-16 items-center justify-center rounded-2xl bg-card text-2xl font-bold text-brand-soft-foreground shadow-e1 ring-1 ring-primary/10">
              {initial}
            </span>
          }
        />

        {categoryName && (
          <span className="pointer-events-none absolute left-3 top-3 max-w-[65%] truncate rounded-full bg-card/92 px-2.5 py-1 text-caption font-semibold text-foreground shadow-e1 backdrop-blur-sm">
            {categoryName}
          </span>
        )}

        <span className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
          <span className="flex min-w-0 flex-wrap gap-1.5">
            {status && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card/92 px-2.5 py-1 text-caption font-semibold shadow-e1 backdrop-blur-sm">
                <span
                  aria-hidden
                  className={
                    status.isOpen ? 'ui-live-dot' : 'size-2 rounded-full bg-muted-foreground/60'
                  }
                />
                <span
                  className={
                    status.isOpen ? 'text-success-soft-foreground' : 'text-muted-foreground'
                  }
                >
                  {status.isOpen ? t('card.open') : t('card.closed')}
                </span>
              </span>
            )}
            {distanceKm != null && Number.isFinite(distanceKm) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-card/92 px-2.5 py-1 text-caption font-semibold text-foreground shadow-e1 backdrop-blur-sm">
                <Navigation className="size-3 text-primary" aria-hidden />
                {formatDistance(distanceKm)}
              </span>
            )}
          </span>
          {offerCount > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-caption font-semibold text-primary-foreground shadow-e1">
              <TicketPercent className="size-3.5" aria-hidden />
              {offerCount} {offerCount === 1 ? 'offer' : 'offers'}
            </span>
          )}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="flex min-w-0 items-center gap-1.5">
          <Link
            href={href}
            onClick={onOpen}
            className="min-w-0 truncate text-base font-semibold tracking-tight text-foreground outline-none after:absolute after:inset-0 after:rounded-card after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {business.name}
          </Link>
          {business.isVerified && <VerifiedBadge />}
          {isFood && business.halalStatus === 'HALAL' && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-success-soft px-1.5 py-0.5 text-caption font-semibold text-success-soft-foreground">
              <BadgeCheck className="size-3" aria-hidden />
              Halal
            </span>
          )}
        </h3>

        {context && (
          <p className="flex min-w-0 items-center gap-1 text-label font-normal text-muted-foreground">
            {brandName || outlet ? (
              <Store className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <MapPin className="size-3.5 shrink-0" aria-hidden />
            )}
            <span className="truncate">{context}</span>
          </p>
        )}

        {showLinks && business.description && (
          <p className="line-clamp-2 break-words text-label font-normal text-muted-foreground">
            {business.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
          <span className="inline-flex items-center gap-1 text-sm">
            {ratingNum != null && Number.isFinite(ratingNum) && reviews > 0 ? (
              <>
                <Star className="size-4 fill-warning text-warning-soft-foreground" aria-hidden />
                <span className="font-semibold tabular-nums text-foreground">
                  {ratingNum.toFixed(1)}
                </span>
                <span className="text-caption text-muted-foreground">({reviews})</span>
              </>
            ) : (
              <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-caption font-medium text-muted-foreground">
                New
              </span>
            )}
            {(brandName || outlet) && business.city && (
              <span className="ml-2 inline-flex min-w-0 items-center gap-0.5 text-caption text-muted-foreground">
                <MapPin className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{business.city}</span>
              </span>
            )}
          </span>
          <ReportButton
            kind="business"
            targetId={business.id}
            targetName={business.name}
            className="relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full text-subtle-foreground opacity-70 transition-[opacity,color,background-color] hover:bg-danger-soft hover:text-danger-soft-foreground hover:opacity-100 focus-visible:opacity-100"
          />
        </div>

        {address && (
          <p className="relative z-[1] flex min-w-0 items-start gap-1 text-caption text-muted-foreground">
            <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden />
            <span className="line-clamp-2 break-words">{address}</span>
          </p>
        )}

        {(instagram || website) && (
          <div className="relative z-[1] flex flex-wrap gap-x-4 gap-y-1 text-caption">
            {instagram && (
              <a
                href={`https://instagram.com/${instagram.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-6 min-w-0 items-center gap-1 text-primary hover:underline"
              >
                <Instagram className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{instagram}</span>
              </a>
            )}
            {website && (
              <a
                href={website.startsWith('http') ? website : `https://${website}`}
                target="_blank"
                rel="noreferrer"
                onClick={() =>
                  track('WEBSITE_CLICK', { businessId: business.id, source: 'search' })
                }
                className="inline-flex min-h-6 min-w-0 items-center gap-1 text-primary hover:underline"
              >
                <Globe className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{website}</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Bookmark — above the stretched link; 44px hit area around a 36px visual */}
      <button
        type="button"
        onClick={onBookmark}
        aria-label={
          saved ? `Remove ${business.name} from favorites` : `Save ${business.name} to favorites`
        }
        aria-pressed={saved}
        className="absolute right-1.5 top-1.5 z-[1] flex size-11 items-center justify-center"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-card/92 shadow-e1 backdrop-blur-sm transition-transform duration-150 hover:scale-110 active:scale-90 motion-reduce:transition-none">
          <Heart
            className={cn(
              'size-[18px] transition-colors',
              saved ? 'fill-primary text-primary' : 'text-foreground',
            )}
          />
        </span>
      </button>
    </article>
  );
}
