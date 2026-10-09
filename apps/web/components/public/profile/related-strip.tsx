'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MapPin, Star } from 'lucide-react';
import { ResponsiveImage } from '@/components/common/responsive-image';
import { useCachedGet } from '@/lib/use-cached-get';
import { RelatedSkeleton } from './profile-skeletons';
import { asList, toNum } from './profile-utils';

/**
 * "More in <category>" — a small horizontal strip of sibling listings. It waits
 * a beat after mount so it never competes with the profile's own requests, and
 * hides itself entirely when there is nothing to show.
 */
export function RelatedStrip({
  categoryId,
  categoryName,
  currentIds,
}: {
  categoryId?: string | null;
  categoryName?: string;
  currentIds: (string | undefined)[];
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  const { data, loading } = useCachedGet<any>(
    categoryId && ready
      ? `/v1/businesses?categoryId=${encodeURIComponent(categoryId)}&limit=6`
      : null,
    { ttlMs: 120_000 },
  );

  const skip = currentIds.filter(Boolean).join('|');
  const items = useMemo(() => {
    const exclude = new Set(skip ? skip.split('|') : []);
    return asList(data)
      .filter((b) => b && b.id && !exclude.has(b.id) && !exclude.has(b.slug))
      .slice(0, 5);
  }, [data, skip]);

  if (!categoryId || !ready) return null;
  if (!loading && items.length === 0) return null;

  return (
    <section aria-label="Related businesses" className="mt-4">
      <h2 className="mb-4 text-xl font-bold text-foreground sm:text-2xl">
        More in {categoryName || 'this category'}
      </h2>
      {loading && items.length === 0 ? (
        <RelatedSkeleton />
      ) : (
        <div className="ui-scroll-x flex gap-3 pb-2">
          {items.map((b) => {
            const rating = toNum(b.averageRating ?? b.rating);
            const place = b.city || b.district;
            return (
              <Link
                key={b.id}
                href={`/business/${b.id}`}
                className="ui-lift w-56 shrink-0 overflow-hidden rounded-2xl border border-border bg-card hover:border-primary/40"
              >
                <ResponsiveImage
                  src={b.coverImage || b.logo}
                  alt=""
                  ratio="16 / 10"
                  sizes="224px"
                  fallback={
                    <span className="text-3xl font-black text-primary/30">
                      {(b.name || '?').trim().charAt(0).toUpperCase()}
                    </span>
                  }
                />
                <div className="space-y-1 p-3">
                  <p className="truncate text-sm font-semibold text-foreground">{b.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {rating > 0 && (
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                        {rating.toFixed(1)}
                      </span>
                    )}
                    {place && (
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{place}</span>
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
