'use client';

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Building2, Tag, Clock, X } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { useCachedGet } from '@/lib/use-cached-get';
import { track } from '@/lib/analytics/track';
import { useI18n } from '@/lib/i18n/provider';
import { categoryLabel } from '@/lib/platform-offers';
import { GridSkeleton } from '@/components/common/skeletons';
import { EmptyState } from '@/components/common/empty-state';
import { ActiveFilters, FilterBar, type FilterShow } from '@/components/public/search/filter-bar';
import { ResultsView, ViewToggle, type ResultsMode } from '@/components/public/search/results-view';
import { SearchPageSkeleton } from '@/components/public/search/search-skeleton';
import { useRecentSearches } from '@/components/public/search/use-recent-searches';
import { useUrlState } from '@/components/public/search/use-url-state';
import {
  applyClientFilters,
  detectCapabilities,
  parseFilters,
  sortItems,
  toList,
  totalOf,
  writeFilters,
  DEFAULT_FILTERS,
  type Filters,
} from '@/components/public/search/filters';

interface PlatformOfferResult {
  id: string;
  title: string;
  location: string;
  category: string;
  price?: string | null;
}

// Same spelling-variant groups as apps/api/src/modules/search/search.service.ts,
// scoped to platform-offer categories only — keeps this client-side filter in
// sync with the API's synonym expansion without pulling in the full list.
const PLATFORM_OFFER_SYNONYMS: Record<string, string[]> = {
  SADYA: ['sadya', 'sadhya', 'sadhya feast', 'onam sadya', 'onam sadhya'],
  PAYASAM: ['payasam', 'payasam sweet', 'payasam dessert'],
  STAYCATION: ['staycation', 'stay cation', 'day-out', 'day out', 'dayout'],
  CLOTHING: ['clothing', 'clothes', 'apparel', 'fashion'],
  ELECTRONICS: ['electronics', 'electronic', 'gadgets', 'appliances'],
  FESTIVE: ['festive', 'festival', 'seasonal', 'onam', 'diwali', 'christmas', 'eid', 'vishu'],
  DINE_IN: ['dine in', 'dine-in', 'dining'],
  TAKEAWAY: ['takeaway', 'take away', 'take-away'],
  HYPERMARKET: ['hypermarket', 'hyper market', 'supermarket'],
  JEWELLERY: ['jewellery', 'jewelry', 'gold', 'diamond'],
  STATIONERY: ['stationery', 'stationary', 'school supplies'],
  FOOD: ['food', 'restaurant'],
};

function matchesPlatformOffer(o: any, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  if ((o.title || '').toLowerCase().includes(q)) return true;
  if ((o.location || '').toLowerCase().includes(q)) return true;
  if ((o.description || '').toLowerCase().includes(q)) return true;
  const synonyms = PLATFORM_OFFER_SYNONYMS[o.category] || [];
  return synonyms.some((s) => s.includes(q) || q.includes(s));
}

/* ── URL <-> state ──────────────────────────────────────────────────────
   q, open, rating, halal, fulfilment, sort, city. Everything else in the URL
   is left alone. The landing page links to /search?open=1. */
type SearchState = Filters & { q: string; view: ResultsMode };
const URL_KEYS: (keyof Filters)[] = ['open', 'rating4', 'halal', 'fulfilment', 'sort', 'city'];
const parseSearch = (sp: URLSearchParams): SearchState => ({
  ...parseFilters(sp),
  q: sp.get('q') || '',
  view: sp.get('view') === 'map' ? 'map' : 'list',
});
const applySearch = (sp: URLSearchParams, v: SearchState) => {
  if (v.q.trim()) sp.set('q', v.q.trim());
  else sp.delete('q');
  if (v.view === 'map') sp.set('view', 'map');
  else sp.delete('view');
  writeFilters(sp, v, URL_KEYS);
};

const PAGE_SIZE = 20; // the discover endpoint's fixed page size
const SORTS = ['relevant', 'rating', 'reviews', 'newest'] as const;
const EMPTY_SUGGESTIONS = {
  businesses: [] as any[],
  categories: [] as string[],
  subcategories: [] as string[],
};
const FALLBACK_IDEAS = ['Restaurants', 'Salon', 'Hotels', 'Gifts'];
const EMPTY_MORE = { key: '', items: [] as any[], page: 1, done: false, loading: false };

function SearchContent() {
  const { t } = useI18n();
  const {
    value: state,
    update,
    externalVersion,
  } = useUrlState<SearchState>({ parse: parseSearch, apply: applySearch });
  const {
    recents,
    add: addRecent,
    remove: removeRecent,
    clear: clearRecents,
  } = useRecentSearches();

  // The input is the raw text; `state.q` trails it by 300ms so we don't fire a request per keystroke.
  const [searchTerm, setSearchTerm] = useState(state.q);
  // A term we just committed (picked, submitted, or arrived in the URL from the home
  // search / back button): don't pop the suggestion dropdown open over its results.
  const skipSuggest = useRef<string | null>(state.q.trim() || null);
  useEffect(() => {
    if (externalVersion > 0) {
      skipSuggest.current = state.q.trim() || null;
      setSearchTerm(state.q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalVersion]);
  useEffect(() => {
    const t = setTimeout(() => {
      update((s) => (s.q === searchTerm.trim() ? s : { ...s, q: searchTerm.trim() }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm, update]);

  /* ── Results (page 1 through the shared SWR cache, later pages on demand) ── */
  const baseQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.city) p.set('city', state.city);
    if (state.rating4) p.set('minRating', '4');
    if (state.open) p.set('open', '1');
    if (state.halal) p.set('halal', '1');
    if (state.fulfilment) p.set('fulfilment', state.fulfilment);
    return p.toString();
  }, [state.q, state.city, state.rating4, state.open, state.halal, state.fulfilment]);
  const key = `/v1/search/discover?${baseQuery}`;
  const first = useCachedGet<any>(key);

  const [more, setMore] = useState<{
    key: string;
    items: any[];
    page: number;
    done: boolean;
    loading: boolean;
  }>({
    key: '',
    items: [],
    page: 1,
    done: false,
    loading: false,
  });
  const extra = useMemo(() => (more.key === key ? more : EMPTY_MORE), [more, key]);

  const page1 = useMemo(() => toList(first.data), [first.data]);
  const total = totalOf(first.data);
  const all = useMemo(() => {
    const seen = new Set<string>();
    return [...page1, ...extra.items].filter((b) => {
      if (!b?.id || seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  }, [page1, extra.items]);
  const hasMore =
    !extra.done &&
    all.length > 0 &&
    (total != null ? all.length < total : page1.length >= PAGE_SIZE);

  // One SEARCH event per distinct query once results land (feeds "what people search for").
  const trackedQuery = useRef<string | null>(null);
  useEffect(() => {
    const q = state.q?.trim();
    if (!q || first.loading || first.data === undefined || trackedQuery.current === baseQuery)
      return;
    trackedQuery.current = baseQuery;
    track('SEARCH', {
      source: 'search',
      metadata: {
        query: q.slice(0, 80),
        resultCount: total ?? page1.length,
        city: state.city || undefined,
      },
    });
  }, [state.q, state.city, baseQuery, first.loading, first.data, total, page1.length]);

  const loadMore = useCallback(async () => {
    if (extra.loading || extra.done) return;
    const nextPage = extra.page + 1;
    setMore({ ...extra, key, loading: true });
    const res = await apiService.get<any>(`${key}${baseQuery ? '&' : ''}page=${nextPage}`);
    const list = res.error ? [] : toList(res.data);
    setMore((prev) => {
      const base =
        prev.key === key ? prev : { key, items: [], page: 1, done: false, loading: false };
      return {
        key,
        items: [...base.items, ...list],
        page: nextPage,
        done: !!res.error || list.length < PAGE_SIZE,
        loading: false,
      };
    });
  }, [extra, key, baseQuery]);

  /* ── "Open now": discover docs now carry operatingHours; if an older API
         doesn't send the field, hydrate it from /v1/businesses (full rows). ── */
  const needsHours = state.open && all.length > 0 && all.some((b) => !('operatingHours' in b));
  const hoursSrc = useCachedGet<any>(
    needsHours
      ? `/v1/businesses?limit=100${state.city ? `&city=${encodeURIComponent(state.city)}` : ''}`
      : null,
  );
  const items = useMemo(() => {
    if (!needsHours) return all;
    const hours = new Map<string, unknown>();
    for (const b of toList(hoursSrc.data)) if (b?.id) hours.set(b.id, b.operatingHours ?? null);
    return all.map((b) =>
      'operatingHours' in b || !hours.has(b.id) ? b : { ...b, operatingHours: hours.get(b.id) },
    );
  }, [all, needsHours, hoursSrc.data]);

  const caps = useMemo(() => detectCapabilities(items), [items]);
  const filtered = useMemo(
    () => applyClientFilters(items, state, new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, state.open, state.rating4, state.halal, state.fulfilment],
  );
  const results = useMemo(() => sortItems(filtered, state.sort), [filtered, state.sort]);
  // Every filter is applied by the API now, so its total is exact.
  const clientOnly = false;

  const showChips: FilterShow = {
    open: true,
    rating: true,
    halal: (caps.hasFood && caps.hasHalalData) || state.halal,
    fulfilment: caps.hasFulfilmentData || !!state.fulfilment,
    city: true,
    sorts: [...SORTS],
  };

  const loading = first.loading && page1.length === 0;
  const refreshing = first.loading && page1.length > 0;
  const failed = !!first.error && page1.length === 0 && !first.loading;

  /* ── Platform offers (Sadya/Payasam/Staycation/…): not tied to a business, so
         they never reach the index — fetched once, filtered client-side. ── */
  const platformSrc = useCachedGet<any>('/v1/platform-offers/public');
  const platformResults: PlatformOfferResult[] = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return toList(platformSrc.data)
      .filter((o) => matchesPlatformOffer(o, searchTerm))
      .map((o) => ({
        id: o.id,
        title: o.title,
        location: o.location,
        category: categoryLabel(o.category),
        price: o.price,
      }));
  }, [platformSrc.data, searchTerm]);

  /* ── Type-ahead suggestions + recents ── */
  const [suggestions, setSuggestions] = useState(EMPTY_SUGGESTIONS);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focused, setFocused] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setFocused(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, []);

  useEffect(() => {
    const term = searchTerm;
    if (term.length < 2) {
      setSuggestions(EMPTY_SUGGESTIONS);
      setShowSuggestions(false);
      return;
    }
    if (skipSuggest.current === term.trim()) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await apiService.get<any>(`/v1/search/suggestions?q=${encodeURIComponent(term)}`);
      if (cancelled || !res.data) return;
      setSuggestions({
        businesses: res.data.businesses ?? [],
        categories: res.data.categories ?? [],
        subcategories: res.data.subcategories ?? [],
      });
      setShowSuggestions(true);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchTerm]);

  const commit = (term: string) => {
    const t = term.trim();
    skipSuggest.current = t;
    setSearchTerm(term);
    update((s) => ({ ...s, q: t }));
    addRecent(t);
    setShowSuggestions(false);
    setFocused(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    commit(searchTerm);
    inputRef.current?.blur();
  };

  const clearInput = () => {
    skipSuggest.current = null;
    setSearchTerm('');
    update((s) => ({ ...s, q: '' }));
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const hasSuggestions =
    showSuggestions &&
    (suggestions.businesses.length > 0 ||
      suggestions.categories.length > 0 ||
      suggestions.subcategories.length > 0);
  const showRecents = focused && searchTerm.length === 0 && recents.length > 0;

  // Combobox keyboard support: ↑/↓ move through the suggestions, Enter opens one, Esc closes.
  const [activeSugg, setActiveSugg] = useState(-1);
  const subs = suggestions.subcategories.filter(Boolean);
  const suggCount = hasSuggestions
    ? suggestions.businesses.length + suggestions.categories.length + subs.length
    : 0;
  useEffect(() => setActiveSugg(-1), [suggestions, showSuggestions]);
  const optId = (i: number) => `search-sugg-${i}`;
  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      return;
    }
    if (!suggCount) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next =
        e.key === 'ArrowDown'
          ? (activeSugg + 1) % suggCount
          : (activeSugg - 1 + suggCount) % suggCount;
      setActiveSugg(next);
      document.getElementById(optId(next))?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && activeSugg >= 0) {
      e.preventDefault();
      document.getElementById(optId(activeSugg))?.click();
    }
  };

  // Ideas for the empty state — real category names when we have them.
  const cats = useCachedGet<any>('/v1/categories', { ttlMs: 5 * 60_000 });
  const ideas = useMemo(() => {
    const names = toList(cats.data)
      .slice()
      .sort((a, b) => (Number(b.listingsCount) || 0) - (Number(a.listingsCount) || 0))
      .map((c) => c.name)
      .filter(Boolean)
      .slice(0, 6);
    return names.length ? names : FALLBACK_IDEAS;
  }, [cats.data]);

  const setFilters = useCallback(
    (patch: Partial<Filters>) => update(patch as Partial<SearchState>),
    [update],
  );
  const clearAllFilters = () => update({ ...DEFAULT_FILTERS });

  const countLabel = (() => {
    const n = !clientOnly && total != null ? total : results.length;
    const plus = clientOnly && hasMore ? '+' : '';
    const count = plus
      ? t('search.resultsPlus', { n })
      : t(n === 1 ? 'search.result' : 'search.results', { n });
    return state.q ? t('search.for', { count, q: state.q }) : count;
  })();

  const rememberSearch = () => addRecent(state.q);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-3 text-2xl font-bold sm:text-3xl">{t('search.title')}</h1>

      {/* Sticky: search box + filter chips stay in reach while the results scroll */}
      <div className="sticky top-0 z-30 -mx-4 border-b border-border/60 bg-background/95 px-4 pb-2 pt-2">
        <form role="search" onSubmit={onSubmit}>
          <div ref={searchBoxRef} className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              aria-label="Search businesses"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={hasSuggestions}
              aria-controls="search-suggestions"
              aria-activedescendant={activeSugg >= 0 ? optId(activeSugg) : undefined}
              onKeyDown={onSearchKeyDown}
              placeholder={t('search.placeholder')}
              value={searchTerm}
              onChange={(e) => {
                skipSuggest.current = null;
                setSearchTerm(e.target.value);
              }}
              onFocus={() => {
                setFocused(true);
                if (searchTerm.length >= 2) setShowSuggestions(true);
              }}
              className="h-12 rounded-xl pl-10 pr-11 text-base [&::-webkit-search-cancel-button]:hidden"
              autoComplete="off"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={clearInput}
                aria-label="Clear search"
                className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Recent searches (focused + empty) */}
            {showRecents && (
              <div className="ui-pop absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                <div className="flex items-center justify-between px-4 pb-1 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t('search.recent')}
                  </p>
                  <button
                    type="button"
                    onClick={clearRecents}
                    className="-my-2 min-h-11 cursor-pointer px-1 text-xs font-medium text-primary hover:underline"
                  >
                    {t('search.clear')}
                  </button>
                </div>
                {recents.map((r) => (
                  <div key={r} className="flex items-center transition-colors hover:bg-muted/40">
                    <button
                      type="button"
                      onClick={() => commit(r)}
                      className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 px-4 text-left"
                    >
                      <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm text-foreground">{r}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRecent(r)}
                      aria-label={`Remove ${r} from recent searches`}
                      className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="h-2" />
              </div>
            )}

            {/* Suggestions dropdown */}
            {hasSuggestions && (
              <div
                id="search-suggestions"
                role="listbox"
                aria-label="Suggestions"
                className="ui-pop absolute left-0 right-0 top-full z-50 mt-1 max-h-[60vh] overflow-y-auto overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
              >
                {suggestions.businesses.length > 0 && (
                  <div>
                    <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {t('search.businesses')}
                    </p>
                    {suggestions.businesses.map((b, i) => (
                      <Link
                        key={b.id}
                        id={optId(i)}
                        role="option"
                        aria-selected={activeSugg === i}
                        href={`/business/${b.id}`}
                        onClick={() => {
                          addRecent(searchTerm);
                          setShowSuggestions(false);
                        }}
                        className={`flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2 transition-colors hover:bg-muted/40 ${activeSugg === i ? 'bg-muted/60' : ''}`}
                      >
                        <Building2 className="h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{b.name}</p>
                          {b.categoryName && (
                            <p className="truncate text-xs text-muted-foreground">
                              {b.categoryName}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {suggestions.categories.length > 0 && (
                  <div>
                    <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {t('search.categories')}
                    </p>
                    {suggestions.categories.map((cat, j) => {
                      const i = suggestions.businesses.length + j;
                      return (
                        <button
                          type="button"
                          key={cat}
                          id={optId(i)}
                          role="option"
                          aria-selected={activeSugg === i}
                          onClick={() => commit(cat)}
                          className={`flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-muted/40 ${activeSugg === i ? 'bg-muted/60' : ''}`}
                        >
                          <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="text-sm text-foreground">{cat}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {suggestions.subcategories.filter(Boolean).length > 0 && (
                  <div>
                    <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {t('search.subcategories')}
                    </p>
                    {subs.map((sub, j) => {
                      const i = suggestions.businesses.length + suggestions.categories.length + j;
                      return (
                        <button
                          type="button"
                          key={sub}
                          id={optId(i)}
                          role="option"
                          aria-selected={activeSugg === i}
                          onClick={() => commit(sub)}
                          className={`flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-muted/40 ${activeSugg === i ? 'bg-muted/60' : ''}`}
                        >
                          <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="text-sm text-foreground">{sub}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="h-2" />
              </div>
            )}
          </div>
        </form>

        <FilterBar
          className="mt-2"
          filters={state}
          onChange={setFilters}
          show={showChips}
          resultCount={results.length}
        />
      </div>

      <ActiveFilters className="mt-3" filters={state} onChange={setFilters} show={showChips} />

      <div className="mb-3 mt-3 flex min-h-10 items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {loading ? t('search.searching') : failed ? '' : countLabel}
        </p>
        <ViewToggle value={state.view} onChange={(view) => update({ view })} />
      </div>

      {platformResults.length > 0 && (
        <div className="mb-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Platform Offers
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {platformResults.map((o, i) => (
              <Link
                key={o.id}
                href="/offers"
                className="ui-fade-up ui-press flex min-h-14 items-center justify-between gap-3 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 transition-colors hover:border-warning/40"
                style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{o.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {o.category} · {o.location}
                  </p>
                </div>
                {o.price && (
                  <span className="shrink-0 text-sm font-bold text-primary">{o.price}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <GridSkeleton variant="business" count={6} />
      ) : failed ? (
        <EmptyState
          icon={Search}
          title={t('search.loadFailed')}
          description={t('search.loadFailedHint')}
          action={{ label: t('search.tryAgain'), onClick: () => void first.refresh() }}
        />
      ) : results.length === 0 ? (
        items.length > 0 || hasMore ? (
          // Results exist, but the active filters hide all of them.
          <EmptyState
            icon={Search}
            title={t('search.noMatchFilters')}
            description={
              state.open
                ? 'Only businesses with listed opening hours can be matched to "Open now".'
                : t('search.removeFilterHint')
            }
            action={{ label: t('search.clearFilters'), onClick: clearAllFilters }}
            secondary={
              hasMore ? { label: 'Load more results', onClick: () => void loadMore() } : undefined
            }
          />
        ) : platformResults.length === 0 ? (
          <div>
            <EmptyState
              icon={Search}
              title={t('search.noResults')}
              description={t('search.noResultsHint')}
              action={
                state.city
                  ? { label: t('search.allCitiesCta'), onClick: () => update({ city: '' }) }
                  : undefined
              }
            />
            <div className="mt-5 text-center">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t('search.popular')}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {ideas.map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => commit(idea)}
                    className="ui-press inline-flex h-11 cursor-pointer items-center rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null
      ) : (
        <div
          aria-busy={refreshing}
          className={refreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'}
        >
          <ResultsView
            mode={state.view}
            items={results}
            showLinks
            onLinkClick={rememberSearch}
            mapClassName="lg:top-48 lg:h-[calc(100dvh-13rem)]"
          />
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadMore()}
                disabled={extra.loading || first.loading}
                className="h-11 min-w-44 rounded-xl"
              >
                {extra.loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {t('search.loading')}
                  </>
                ) : (
                  t('search.showMore')
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <PublicLayout>
      <Suspense fallback={<SearchPageSkeleton bare />}>
        <SearchContent />
      </Suspense>
    </PublicLayout>
  );
}
