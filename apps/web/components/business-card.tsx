'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getOpenStatus, hasOperatingHours } from '@saas/types';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Tag, BadgeCheck, Heart, Navigation, Store, Globe, Instagram } from 'lucide-react';
import { ReportButton } from './report-button';
import { VerifiedBadge } from './common/verified-badge';
import { ResponsiveImage } from './common/responsive-image';
import { formatDistance } from './public/search/geo';
import { isFavorite, toggleFavorite, FAVORITES_EVENT } from '@/lib/favorites';
import { cn } from '@/lib/utils';

/**
 * Public business card (Browse / Search / Category / Nearby).
 *
 * Cover (logo or initial) with category pill, bookmark, optional distance and
 * live-offer badges; then name + trust markers, brand/outlet line, rating and
 * city, a live "Open now · closes 9 PM" status when the business has listed
 * hours, tags and actions. Tokens only — inherits the brand palette.
 *
 * Only `business` is required; every other prop is optional so existing
 * callers keep working unchanged.
 */
export function BusinessCard({
  business,
  distanceKm,
  className,
  priority = false,
  showLinks = false,
}: {
  business: any;
  /** Shown as a "1.2 km" badge on the cover (Nearby). */
  distanceKm?: number | null;
  className?: string;
  /** Eager-load the cover (use for the first row of a long list). */
  priority?: boolean;
  /** Also show the street address and Instagram / website links (Search results). */
  showLinks?: boolean;
}) {
  const tags: string[] = Array.isArray(business.tags) ? business.tags : [];
  const isFood = /food|restaurant|cafe|bakery|hotel/i.test(
    business.category?.slug || business.category?.name || '',
  );
  const rating = business.avgRating ?? business.averageRating;
  const ratingNum = rating != null && rating !== '' ? Number(rating) : null;
  const reviews = business.reviewCount ?? business.totalReviews ?? 0;
  // Cover banners are retired; the card shows the logo (or an initial) instead.
  const cover: string | undefined = business.logo || undefined;
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

  // Open/closed depends on "now", so it is computed after mount (never during
  // SSR) to avoid a hydration mismatch. Only businesses with listed hours get a line.
  const hasHours = hasOperatingHours(business.operatingHours);
  const [status, setStatus] = useState<{ isOpen: boolean; label: string } | null>(null);
  useEffect(() => {
    setStatus(hasHours ? getOpenStatus(business.operatingHours, new Date()) : null);
  }, [hasHours, business.operatingHours]);

  const onBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSaved(toggleFavorite(business));
  };

  const address = showLinks
    ? [business.address, business.city, business.state].filter(Boolean).join(', ')
    : '';
  const instagram: string | undefined = showLinks ? business.socialLinks?.instagram : undefined;
  const website: string | undefined = showLinks ? business.website : undefined;

  return (
    <div
      className={cn(
        'group ui-lift ui-press flex h-full flex-col overflow-hidden rounded-[22px] border border-border bg-card shadow-sm hover:border-primary/25',
        className,
      )}
    >
      {/* Cover */}
      <div className="relative">
        <Link href={href} className="block" aria-label={business.name}>
          <ResponsiveImage
            src={cover}
            alt={business.name || 'Business'}
            ratio="16 / 8"
            priority={priority}
            className="bg-gradient-to-br from-secondary to-secondary/40"
            imgClassName="transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            fallback={<span className="text-4xl font-black text-muted-foreground/25">{initial}</span>}
          />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
            <span className="flex min-w-0 flex-wrap gap-1.5">
              {distanceKm != null && Number.isFinite(distanceKm) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur-sm">
                  <Navigation className="h-3 w-3 shrink-0 text-primary" />
                  {formatDistance(distanceKm)}
                </span>
              )}
            </span>
            {offerCount > 0 && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm">
                <Tag className="h-3 w-3" />
                {offerCount} {offerCount === 1 ? 'offer' : 'offers'}
              </span>
            )}
          </span>
          {categoryName && (
            <span className="pointer-events-none absolute left-3 top-3 max-w-[65%] truncate rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-semibold text-primary shadow-sm backdrop-blur-sm">
              {categoryName}
            </span>
          )}
        </Link>

        {/* Bookmark — 44px hit area around a 36px visual */}
        <button
          type="button"
          onClick={onBookmark}
          aria-label={saved ? 'Remove from favorites' : 'Save to favorites'}
          aria-pressed={saved}
          className="absolute right-1.5 top-1.5 flex h-11 w-11 cursor-pointer items-center justify-center"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-md transition-transform duration-150 hover:scale-110 active:scale-90 motion-reduce:transition-none">
            <Heart className={cn('h-4 w-4 transition-colors', saved && 'fill-rose-500 text-rose-500')} />
          </span>
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <Link
            href={href}
            className="min-w-0 max-w-full truncate font-semibold text-foreground transition-colors hover:text-primary"
          >
            {business.name}
          </Link>
          {business.isVerified && <VerifiedBadge />}
          {isFood && business.halalStatus === 'HALAL' && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-success/25 bg-success/12 px-1.5 py-0.5 text-[10px] font-semibold text-success">
              <BadgeCheck className="h-3 w-3 shrink-0" />
              Halal
            </span>
          )}
        </div>

        {(brandName || outlet) && (
          <p className="mb-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <Store className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {brandName && outlet ? `${brandName} · ${outlet}` : brandName || outlet}
            </span>
          </p>
        )}

        {business.description && (
          <p className="mb-2 line-clamp-2 break-words text-xs leading-relaxed text-muted-foreground">
            {business.description}
          </p>
        )}

        {/* Rating + city. Wraps on narrow screens, and the city truncates
            instead of overflowing the card — flex children default to
            min-width:auto, so min-w-0 is required for truncate to work. */}
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="inline-flex shrink-0 items-center gap-1">
            <Star className="h-4 w-4 shrink-0 fill-warning text-warning" />
            <span className="font-semibold tabular-nums text-foreground">
              {ratingNum != null && Number.isFinite(ratingNum) ? ratingNum.toFixed(1) : '—'}
            </span>
            <span className="text-xs text-muted-foreground">({reviews})</span>
          </span>
          {business.city && (
            <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{business.city}</span>
            </span>
          )}
        </div>

        {hasHours && (
          <p className="mb-2 flex min-h-5 items-center gap-1.5 text-xs font-medium">
            {status && (
              <>
                <span
                  aria-hidden
                  className={status.isOpen ? 'ui-live-dot shrink-0' : 'h-2 w-2 shrink-0 rounded-full bg-muted-foreground/50'}
                />
                <span
                  className={cn(
                    'truncate',
                    status.isOpen ? 'text-success-foreground dark:text-success' : 'text-muted-foreground',
                  )}
                >
                  {status.label}
                </span>
              </>
            )}
          </p>
        )}

        {address && (
          <p className="mb-2 flex min-w-0 items-start gap-1 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="line-clamp-2 break-words">{address}</span>
          </p>
        )}

        {(instagram || website) && (
          <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {instagram && (
              <a
                href={`https://instagram.com/${instagram.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-6 min-w-0 items-center gap-1 text-primary hover:underline"
              >
                <Instagram className="h-3 w-3 shrink-0" />
                <span className="truncate">{instagram}</span>
              </a>
            )}
            {website && (
              <a
                href={website.startsWith('http') ? website : `https://${website}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-6 min-w-0 items-center gap-1 text-primary hover:underline"
              >
                <Globe className="h-3 w-3 shrink-0" />
                <span className="truncate">{website}</span>
              </a>
            )}
          </div>
        )}

        {tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                <Tag className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{t}</span>
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-1">
          <Button asChild variant="outline" size="sm" className="h-11 flex-1">
            <Link href={href}>View business</Link>
          </Button>
          <ReportButton
            kind="business"
            targetId={business.id}
            targetName={business.name}
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-rose-500/30 hover:text-rose-400"
          />
        </div>
      </div>
    </div>
  );
}
