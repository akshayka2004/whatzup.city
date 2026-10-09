'use client';

import { Suspense, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Building2, MapPin } from 'lucide-react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Button } from '@/components/ui/button';
import { GridSkeleton } from '@/components/common/skeletons';
import { EmptyState } from '@/components/common/empty-state';
import { useCachedGet } from '@/lib/use-cached-get';
import { getViewerCity, setViewerCity } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { categoryIconFor } from '@/components/public/search/category-icon';
import { ActiveFilters, FilterBar, type FilterShow } from '@/components/public/search/filter-bar';
import { ResultsGrid } from '@/components/public/search/results-grid';
import { SearchPageSkeleton } from '@/components/public/search/search-skeleton';
import { useUrlState } from '@/components/public/search/use-url-state';
import {
  applyClientFilters, detectCapabilities, parseFilters, sortItems, toList, totalOf, writeFilters,
  DEFAULT_FILTERS, type Filters,
} from '@/components/public/search/filters';

const PAGE = 24;
const MAX_LIMIT = 120;
const URL_KEYS: (keyof Filters)[] = ['open', 'rating4', 'halal', 'fulfilment', 'sort', 'city', 'sub'];
const SORTS = ['relevant', 'rating', 'reviews', 'newest'] as const;
const parseCat = (sp: URLSearchParams): Filters => parseFilters(sp);
const applyCat = (sp: URLSearchParams, v: Filters) => writeFilters(sp, v, URL_KEYS);

const chip = (active: boolean) =>
  cn(
    'ui-press inline-flex h-11 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors md:h-9 md:px-3.5',
    active
      ? 'border-primary/40 bg-brand-soft text-brand-soft-foreground'
      : 'border-border bg-card text-foreground hover:bg-secondary',
  );

function CategoryContent() {
  const searchParams = useSearchParams();
  const rawType = searchParams.get('type') || 'all';
  const categoryTitle =
    rawType === 'all' ? 'All Businesses' : rawType.charAt(0).toUpperCase() + rawType.slice(1);

  const { value: filters, update } = useUrlState<Filters>({ parse: parseCat, apply: applyCat });

  // The viewer's saved city is the default (same as before) unless the URL already names one.
  // Gate the first fetch on it so we don't request "all cities" and then immediately re-request.
  const [cityReady, setCityReady] = useState(false);
  useEffect(() => {
    if (!filters.city) {
      const saved = getViewerCity();
      if (saved) update({ city: saved });
    }
    setCityReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Category lookup (same matching rules as before) ── */
  const cats = useCachedGet<any>('/v1/categories', { ttlMs: 5 * 60_000 });
  const catList = useMemo(() => toList(cats.data), [cats.data]);
  const match = useMemo(() => {
    if (!rawType || rawType === 'all') return undefined;
    return catList.find(
      (c: any) =>
        c.slug === rawType ||
        c.name?.toLowerCase() === rawType.toLowerCase() ||
        c.name?.toLowerCase().includes(rawType.toLowerCase()),
    );
  }, [catList, rawType]);
  const subcategories: any[] = useMemo(
    () => (Array.isArray(match?.children) ? match.children.filter((c: any) => c?.name) : []),
    [match],
  );
  const catsReady = rawType === 'all' || !cats.loading;

  /* ── Businesses ── */
  // The window resets whenever the category / city / subcategory changes (derived, so no wasted request).
  const sig = `${rawType}|${filters.city}|${filters.sub}`;
  const [win, setWin] = useState({ sig, n: PAGE });
  const limit = win.sig === sig ? win.n : PAGE;
  const widenWindow = useCallback(
    () => setWin((w) => ({ sig, n: Math.min(MAX_LIMIT, (w.sig === sig ? w.n : PAGE) + PAGE) })),
    [sig],
  );

  // With any quick filter on, use the search API, which applies them server-side (exact counts).
  const filtering = filters.open || filters.rating4 || filters.halal || !!filters.fulfilment;
  const key = useMemo(() => {
    if (filtering) {
      const p = new URLSearchParams();
      if (match?.id) p.set('categoryId', match.id);
      const text = filters.sub || (!match?.id && rawType !== 'all' ? rawType : '');
      if (text) p.set('q', text);
      if (filters.city) p.set('city', filters.city);
      if (filters.rating4) p.set('minRating', '4');
      if (filters.open) p.set('open', '1');
      if (filters.halal) p.set('halal', '1');
      if (filters.fulfilment) p.set('fulfilment', filters.fulfilment);
      p.set('limit', String(Math.min(limit, 60)));
      return `/v1/search/discover?${p.toString()}`;
    }
    const params = new URLSearchParams();
    if (match?.id) params.set('categoryId', match.id);
    else if (rawType && rawType !== 'all') params.set('search', rawType);
    // A subcategory is a text search inside the category (matches subcategory names server-side).
    if (filters.sub) params.set('search', filters.sub);
    if (filters.city) params.set('city', filters.city);
    params.set('limit', String(limit));
    return `/v1/businesses?${params.toString()}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.id, rawType, filters.sub, filters.city, limit, filtering, filters.open, filters.rating4, filters.halal, filters.fulfilment]);

  const res = useCachedGet<any>(key, { enabled: catsReady && cityReady });
  const list = useMemo(() => toList(res.data), [res.data]);
  const total = totalOf(res.data);
  const hasMore = list.length >= limit && limit < MAX_LIMIT && (total == null || list.length < total);

  const caps = useMemo(() => detectCapabilities(list), [list]);
  const filtered = useMemo(
    () => applyClientFilters(list, filters, new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list, filters.open, filters.rating4, filters.halal, filters.fulfilment],
  );
  const results = useMemo(() => sortItems(filtered, filters.sort), [filtered, filters.sort]);

  // "Open now" trims the page hard — quietly widen the window (twice at most) until the list isn't bare.
  const widened = useRef(0);
  useEffect(() => {
    widened.current = 0;
  }, [rawType, filters.city, filters.sub, filters.open]);
  useEffect(() => {
    if (!filters.open || !hasMore || res.loading || results.length >= 6 || widened.current >= 2) return;
    widened.current += 1;
    widenWindow();
  }, [filters.open, hasMore, res.loading, results.length, widenWindow]);

  const loading =
    !(catsReady && cityReady) || (res.data == null && !res.error) || (res.loading && list.length === 0);
  const refreshing = res.loading && list.length > 0;
  const failed = !!res.error && list.length === 0 && !res.loading;

  const show: FilterShow = {
    open: true,
    rating: true,
    halal: (caps.hasFood && caps.hasHalalData) || filters.halal,
    fulfilment: (caps.hasFood && caps.hasFulfilmentData) || !!filters.fulfilment,
    city: true,
    sorts: [...SORTS],
  };

  const setFilters = useCallback(
    (patch: Partial<Filters>) => {
      if ('city' in patch) setViewerCity(patch.city || '');
      update(patch);
    },
    [update],
  );
  const clearFilters = () => update({ ...DEFAULT_FILTERS, city: filters.city });

  /* ── Hero + chips ── */
  const heroName: string = match?.name || categoryTitle;
  const Icon = categoryIconFor(match?.slug || match?.name || rawType);
  const clientOnly = false;
  const shown = clientOnly ? results.length : total ?? results.length;
  const countText = loading
    ? ''
    : `${shown}${clientOnly && hasMore ? '+' : ''} ${shown === 1 && !(clientOnly && hasMore) ? 'business' : 'businesses'}${filters.city ? ` in ${filters.city}` : ''}`;

  // Category chips keep the current filters when you hop between categories.
  const hrefFor = (slug: string) => {
    const sp = new URLSearchParams();
    if (slug) sp.set('type', slug);
    writeFilters(sp, filters, ['open', 'rating4', 'halal', 'fulfilment', 'sort', 'city']);
    const qs = sp.toString();
    return qs ? `/category?${qs}` : '/category';
  };

  return (
    <div>
      {/* Hero */}
      <section className="ui-fade-up relative mb-5 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-7">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/12 text-primary">
            <Icon className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-foreground sm:text-3xl">{heroName}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Browse verified businesses in this category</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2" aria-live="polite">
          {countText && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              {countText}
            </span>
          )}
          {filters.city && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {filters.city}
            </span>
          )}
        </div>
      </section>

      {/* Subcategories when this category has them, otherwise the top-level categories */}
      {subcategories.length > 0 ? (
        <nav aria-label="Subcategories" className="-mx-4 mb-3 flex snap-x gap-2 overflow-x-auto px-4 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
          <button
            type="button"
            aria-pressed={!filters.sub}
            onClick={() => update({ sub: '' })}
            className={chip(!filters.sub)}
          >
            All {heroName}
          </button>
          {subcategories.map((s: any) => (
            <button
              key={s.id || s.name}
              type="button"
              aria-pressed={filters.sub === s.name}
              onClick={() => update({ sub: filters.sub === s.name ? '' : s.name })}
              className={chip(filters.sub === s.name)}
            >
              {s.name}
            </button>
          ))}
        </nav>
      ) : (
        catList.length > 0 && (
          <nav aria-label="Categories" className="-mx-4 mb-3 flex snap-x gap-2 overflow-x-auto px-4 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
            <Link href={hrefFor('')} className={chip(rawType === 'all')} aria-current={rawType === 'all' ? 'page' : undefined}>
              All
            </Link>
            {catList.map((c: any) => (
              <Link
                key={c.id}
                href={hrefFor(c.slug || c.name)}
                className={chip(match?.id === c.id)}
                aria-current={match?.id === c.id ? 'page' : undefined}
              >
                {c.name}
              </Link>
            ))}
          </nav>
        )
      )}

      {/* Sticky filters */}
      <div className="sticky top-0 z-30 -mx-4 border-b border-border/60 bg-background/95 px-4 py-2">
        <FilterBar filters={filters} onChange={setFilters} show={show} resultCount={results.length} />
      </div>
      <ActiveFilters className="mt-3" filters={filters} onChange={setFilters} show={show} />

      <div className="mt-4">
        {loading ? (
          <GridSkeleton variant="business" count={6} />
        ) : failed ? (
          <EmptyState
            title="We couldn't load this category"
            description="Check your connection and try again."
            action={{ label: 'Try again', onClick: () => void res.refresh() }}
          />
        ) : results.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No businesses found"
            description={`No businesses found in this category${filters.city ? ` in ${filters.city}` : ''}.`}
            action={
              list.length > 0
                ? { label: 'Clear filters', onClick: clearFilters }
                : filters.city
                  ? { label: 'Show all cities', onClick: () => setFilters({ city: '' }) }
                  : filters.sub
                    ? { label: `All ${heroName}`, onClick: () => update({ sub: '' }) }
                    : undefined
            }
            secondary={rawType !== 'all' ? { label: 'Browse all businesses', href: '/category' } : { label: 'Search instead', href: '/search' }}
          />
        ) : (
          <div aria-busy={refreshing} className={refreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <ResultsGrid items={results} />
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 min-w-44 rounded-xl"
                  disabled={res.loading}
                  onClick={widenWindow}
                >
                  Show more businesses
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CategoryPage() {
  return (
    <PublicLayout>
      <Suspense fallback={<SearchPageSkeleton hero bare />}>
        <CategoryContent />
      </Suspense>
    </PublicLayout>
  );
}
