'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Tag, BadgeCheck, Heart } from 'lucide-react';
import { ReportButton } from './report-button';
import { VerifiedBadge } from './common/verified-badge';
import { isFavorite, toggleFavorite, FAVORITES_EVENT } from '@/lib/favorites';
import { cn } from '@/lib/utils';

/**
 * Public business card (Browse / Nearby). Cover with image-zoom on hover,
 * bookmark toggle, verified + halal trust markers, rating, city, tags.
 * Card lifts + glows on hover. Tokens only — inherits the brand palette.
 */
export function BusinessCard({ business }: { business: any }) {
  const tags: string[] = Array.isArray(business.tags) ? business.tags : [];
  const isFood = /food|restaurant|cafe|bakery|hotel/i.test(
    business.category?.slug || business.category?.name || '',
  );
  const rating = business.avgRating ?? business.averageRating;
  const reviews = business.reviewCount ?? business.totalReviews ?? 0;
  const cover = business.coverImage || business.logo;

  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setSaved(isFavorite(business.id));
    const sync = () => setSaved(isFavorite(business.id));
    window.addEventListener(FAVORITES_EVENT, sync);
    return () => window.removeEventListener(FAVORITES_EVENT, sync);
  }, [business.id]);

  const onBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSaved(toggleFavorite(business));
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-[22px] border border-border bg-card shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl motion-reduce:hover:translate-y-0">
      {/* Cover */}
      <Link href={`/business/${business.id}`} className="relative block h-40 overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={business.name}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-secondary/40">
            <span className="text-4xl font-black text-muted-foreground/25">
              {(business.name || 'B').charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Bookmark */}
        <button
          onClick={onBookmark}
          aria-label={saved ? 'Remove from favorites' : 'Save to favorites'}
          aria-pressed={saved}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-md transition-transform duration-150 hover:scale-110 active:scale-90 motion-reduce:transition-none cursor-pointer"
        >
          <Heart className={cn('h-4 w-4 transition-colors', saved && 'fill-rose-500 text-rose-500')} />
        </button>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <Link
            href={`/business/${business.id}`}
            className="truncate font-semibold text-foreground hover:text-primary transition-colors"
          >
            {business.name}
          </Link>
          {business.isVerified && <VerifiedBadge />}
          {isFood && business.halalStatus === 'HALAL' && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-success/25 bg-success/12 px-1.5 py-0.5 text-[10px] font-semibold text-success">
              <BadgeCheck className="h-3 w-3" />
              Halal
            </span>
          )}
        </div>

        {business.category?.name && (
          <p className="mb-1 truncate text-xs font-medium text-primary">{business.category.name}</p>
        )}

        {business.description && (
          <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {business.description}
          </p>
        )}

        <div className="mb-2 flex items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1">
            <Star className="h-4 w-4 fill-warning text-warning" />
            <span className="font-semibold text-foreground tabular-nums">
              {rating != null ? Number(rating).toFixed(1) : '—'}
            </span>
            <span className="text-xs text-muted-foreground">({reviews})</span>
          </span>
          {business.city && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {business.city}
            </span>
          )}
        </div>

        {tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-0.5 rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                <Tag className="h-2.5 w-2.5" />
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex gap-2">
          <Link href={`/business/${business.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              View business
            </Button>
          </Link>
          <ReportButton kind="business" targetId={business.id} targetName={business.name} />
        </div>
      </div>
    </div>
  );
}
