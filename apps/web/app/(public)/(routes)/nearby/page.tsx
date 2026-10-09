'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigation, MapPin } from 'lucide-react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GridSkeleton } from '@/components/common/skeletons';
import { EmptyState } from '@/components/common/empty-state';
import { useCachedGet } from '@/lib/use-cached-get';
import { KERALA_CITIES, getViewerCity, setViewerCity } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ActiveFilters, FilterBar, type FilterShow } from '@/components/public/search/filter-bar';
import { LocationExplainer, type GeoState } from '@/components/public/search/location-explainer';
import { ResultsView, ViewToggle, type ResultsMode } from '@/components/public/search/results-view';
import { distanceTo } from '@/components/public/search/geo';
import {
  applyClientFilters,
  sortItems,
  toList,
  totalOf,
  DEFAULT_FILTERS,
  type Filters,
  type SortKey,
} from '@/components/public/search/filters';

const RADII = [2, 5, 10, 25] as const;
const PAGE = 18;
const MAX_LIMIT = 90;
const NEAR_SORTS: SortKey[] = ['nearest', 'rating', 'reviews'];

const chip = (active: boolean) =>
  cn(
    'ui-press inline-flex h-11 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors md:h-9 md:px-3.5',
    active
      ? 'border-primary/40 bg-brand-soft text-brand-soft-foreground'
      : 'border-border bg-card text-foreground hover:bg-secondary',
  );

function NearbyContent() {
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS });
  const [mode, setMode] = useState<'city' | 'near'>('city');
  const [geo, setGeo] = useState<GeoState>('idle');
  const [dismissed, setDismissed] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState<number>(5);
  const [city, setCity] = useState('');
  const [cityReady, setCityReady] = useState(false);
  const [resultsMode, setResultsMode] = useState<ResultsMode>('list');

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('view') === 'map') setResultsMode('map');
  }, []);
  const changeMode = (m: ResultsMode) => {
    setResultsMode(m);
    const u = new URL(window.location.href);
    if (m === 'map') u.searchParams.set('view', 'map');
    else u.searchParams.delete('view');
    window.history.replaceState(window.history.state, '', u);
  };

  const onFilters = useCallback(
    (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch })),
    [],
  );

  /* ── Geolocation: ask only after the explainer, never on page load ── */
  const requestLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGeo('unavailable');
      return;
    }
    setGeo('asking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setMode('near');
        setGeo('idle');
      },
      (err) => setGeo(err.code === 1 ? 'denied' : 'error'),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  useEffect(() => {
    setCity(getViewerCity());
    setCityReady(true);

    let cancelled = false;
    (async () => {
      try {
        if (!('geolocation' in navigator)) {
          setGeo('unavailable');
          return;
        }
        // If the visitor already allowed location for this site, skip the explainer.
        const perm = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
        if (!cancelled && perm?.state === 'granted') requestLocation();
      } catch {
        /* No Permissions API (older Safari) — the explainer card covers it. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestLocation]);

  /* ── Data: "near me" (API returns nearest-first with distanceKm) or the original city list ── */
  const nearKey =
    mode === 'near' && coords
      ? `/v1/businesses/nearby?lat=${coords.lat.toFixed(3)}&lng=${coords.lng.toFixed(3)}&radius=${radius}`
      : null;
  const near = useCachedGet<any>(nearKey);

  const [win, setWin] = useState({ city: '', n: PAGE });
  const limit = win.city === city ? win.n : PAGE;
  const cityKey = useMemo(() => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (city) params.set('city', city);
    return `/v1/businesses?${params.toString()}`;
  }, [limit, city]);
  const byCity = useCachedGet<any>(cityKey, { enabled: mode === 'city' && cityReady });

  const active = mode === 'near' ? near : byCity;
  const list = useMemo(() => toList(active.data), [active.data]);
  const loading =
    (mode === 'city' && !cityReady) ||
    (active.data == null && !active.error) ||
    (active.loading && list.length === 0);
  const refreshing = active.loading && list.length > 0;
  const failed = !!active.error && list.length === 0 && !active.loading;

  const distances = useMemo(() => {
    const m = new Map<string, number>();
    if (coords) {
      for (const b of list) {
        const d = distanceTo(b, coords);
        if (d != null) m.set(b.id, d);
      }
    }
    return m;
  }, [list, coords]);

  const inRange = useMemo(
    () =>
      mode === 'near'
        ? list.filter((b) => (distances.get(b.id) ?? Infinity) <= radius + 0.05)
        : list,
    [mode, list, distances, radius],
  );

  const sorts: SortKey[] =
    mode === 'near'
      ? NEAR_SORTS
      : coords
        ? ['relevant', 'nearest', 'rating', 'reviews', 'newest']
        : ['relevant', 'rating', 'reviews', 'newest'];
  const defaultSort = sorts[0];
  const sort = sorts.includes(filters.sort) ? filters.sort : defaultSort;
  const view: Filters = { ...filters, sort };

  const filtered = useMemo(
    () => applyClientFilters(inRange, filters, new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inRange, filters.open, filters.rating4],
  );
  const results = useMemo(() => sortItems(filtered, sort, distances), [filtered, sort, distances]);

  const show: FilterShow = { open: true, rating: true, sorts };
  const hasMoreCity =
    mode === 'city' &&
    list.length >= limit &&
    limit < MAX_LIMIT &&
    (totalOf(active.data) == null || list.length < (totalOf(active.data) as number));

  const onCityChange = (v: string) => {
    const next = v === 'all' ? '' : v;
    setCity(next);
    setViewerCity(next);
  };

  const nextRadius = RADII.find((r) => r > radius);
  const filtersActive = filters.open || filters.rating4;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold sm:text-3xl">Nearby Businesses</h1>
          <p className="text-muted-foreground">Discover businesses around you</p>
        </div>
        {mode === 'city' && (
          <div className="flex items-center gap-2">
            {(coords || dismissed) && (
              <button
                type="button"
                onClick={() => (coords ? setMode('near') : requestLocation())}
                className={cn(chip(false), 'gap-1.5')}
              >
                <Navigation className="h-4 w-4" />
                Near me
              </button>
            )}
            <Select value={city || 'all'} onValueChange={onCityChange}>
              <SelectTrigger
                aria-label="Choose city"
                className="w-full rounded-xl border-border data-[size=default]:h-11 sm:w-52"
              >
                <SelectValue placeholder="Choose city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {KERALA_CITIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {mode === 'city' && !dismissed && !coords && (
        <LocationExplainer
          state={geo}
          onAllow={requestLocation}
          onDismiss={() => setDismissed(true)}
        />
      )}

      {mode === 'near' && (
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <span className="ui-live-dot" aria-hidden />
              Using your location
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={requestLocation}
                disabled={geo === 'asking'}
                className="inline-flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium text-primary hover:underline disabled:opacity-50"
              >
                {geo === 'asking' ? 'Updating…' : 'Update'}
              </button>
              <button
                type="button"
                onClick={() => setMode('city')}
                className="inline-flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
              >
                Browse by city
              </button>
            </div>
          </div>
          {geo === 'denied' || geo === 'error' ? (
            <p className="text-xs text-destructive">
              We couldn’t refresh your location, so the list below uses your last position.
            </p>
          ) : null}
          <div
            role="radiogroup"
            aria-label="Search radius"
            className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0"
          >
            {RADII.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={radius === r}
                onClick={() => setRadius(r)}
                className={chip(radius === r)}
              >
                Within {r} km
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="sticky top-0 z-30 -mx-4 border-b border-border/60 bg-background/95 px-4 py-2">
        <FilterBar
          filters={view}
          onChange={onFilters}
          show={show}
          defaultSort={defaultSort}
          resultCount={results.length}
        />
      </div>
      <ActiveFilters
        className="mt-3"
        filters={view}
        onChange={onFilters}
        show={show}
        defaultSort={defaultSort}
      />

      <div className="mb-3 mt-3 flex min-h-10 items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {loading || failed
            ? ''
            : mode === 'near'
              ? `${results.length} ${results.length === 1 ? 'business' : 'businesses'} within ${radius} km`
              : `${results.length}${hasMoreCity && filtersActive ? '+' : ''} ${results.length === 1 ? 'business' : 'businesses'}${city ? ` in ${city}` : ''}`}
        </p>
        <ViewToggle value={resultsMode} onChange={changeMode} />
      </div>

      {loading ? (
        <GridSkeleton variant="business" count={6} />
      ) : failed ? (
        <EmptyState
          icon={MapPin}
          title="We couldn't load businesses"
          description="Check your connection and try again."
          action={{ label: 'Try again', onClick: () => void active.refresh() }}
        />
      ) : results.length === 0 ? (
        mode === 'near' ? (
          <EmptyState
            icon={MapPin}
            title={
              inRange.length > 0 ? 'No matches with these filters' : `Nothing within ${radius} km`
            }
            description={
              inRange.length > 0
                ? 'Try removing a filter to see more businesses.'
                : 'Try a wider radius, or browse by city instead.'
            }
            action={
              inRange.length > 0
                ? { label: 'Clear filters', onClick: () => setFilters({ ...DEFAULT_FILTERS }) }
                : nextRadius
                  ? {
                      label: `Search within ${nextRadius} km`,
                      onClick: () => setRadius(nextRadius),
                    }
                  : { label: 'Browse by city', onClick: () => setMode('city') }
            }
            secondary={
              inRange.length === 0 && nextRadius
                ? { label: 'Browse by city', onClick: () => setMode('city') }
                : undefined
            }
          />
        ) : (
          <EmptyState
            icon={MapPin}
            title="No businesses found"
            description={`No businesses found${city ? ` in ${city}` : ''}.`}
            action={
              list.length > 0
                ? { label: 'Clear filters', onClick: () => setFilters({ ...DEFAULT_FILTERS }) }
                : city
                  ? { label: 'Show all cities', onClick: () => onCityChange('all') }
                  : undefined
            }
          />
        )
      ) : (
        <div
          aria-busy={refreshing}
          className={refreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'}
        >
          <ResultsView
            mode={resultsMode}
            items={results}
            distances={coords ? distances : undefined}
            center={mode === 'near' ? coords : null}
          />
          {hasMoreCity && (
            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                variant="outline"
                className="h-11 min-w-44 rounded-xl"
                disabled={active.loading}
                onClick={() => setWin({ city, n: Math.min(MAX_LIMIT, limit + PAGE) })}
              >
                Show more businesses
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NearbyPage() {
  return (
    <PublicLayout>
      <NearbyContent />
    </PublicLayout>
  );
}
