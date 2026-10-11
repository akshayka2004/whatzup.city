'use client';

import { useI18n } from '@/lib/i18n/provider';

import { ResponsiveImage } from '@/components/common/responsive-image';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { LayoutGrid, Map as MapIcon, Star, X } from 'lucide-react';
import { ResultsGrid } from '@/components/public/search/results-grid';
import { pointsFrom } from '@/components/public/map/points';
import { track } from '@/lib/analytics/track';
import { useImpression } from '@/lib/analytics/use-impression';
import { cn } from '@/lib/utils';

// MapLibre is ~250 KB; it only loads once someone opens the map.
const BusinessMap = dynamic(
  () => import('@/components/public/map/business-map').then((m) => m.BusinessMap),
  {
    ssr: false,
    loading: () => <div className="ui-skeleton h-full w-full rounded-card" />,
  },
);

export type ResultsMode = 'list' | 'map';

/** List / Map segmented toggle. Lives next to the result count. */
export function ViewToggle({
  value,
  onChange,
  className,
}: {
  value: ResultsMode;
  onChange: (v: ResultsMode) => void;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div
      role="radiogroup"
      aria-label="Results view"
      className={cn(
        'inline-flex rounded-full border border-border bg-card p-0.5 shadow-e1',
        className,
      )}
    >
      {(
        [
          ['list', t('view.list'), LayoutGrid],
          ['map', t('view.map'), MapIcon],
        ] as const
      ).map(([k, l, Icon]) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          onClick={() => onChange(k)}
          className={cn(
            'inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors md:h-9',
            value === k
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="size-4" aria-hidden />
          {l}
        </button>
      ))}
    </div>
  );
}

function Row({
  b,
  km,
  active,
  onHover,
  innerRef,
}: {
  b: any;
  km?: number | null;
  active: boolean;
  onHover: (id: string | null) => void;
  innerRef: (el: HTMLAnchorElement | null) => void;
}) {
  const rating = Number(b.avgRating ?? b.averageRating);
  const reviews = Number(b.reviewCount ?? b.totalReviews ?? 0) || 0;
  const cat = b.category?.name || b.categoryName || '';
  const seenRef = useImpression<HTMLAnchorElement>(b.id);
  return (
    <Link
      ref={(el) => {
        seenRef.current = el;
        innerRef(el);
      }}
      href={`/business/${b.id}`}
      onMouseEnter={() => onHover(b.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(b.id)}
      onClick={() => track('CARD_CLICK', { businessId: b.id, source: 'search' })}
      className={cn(
        'ui-press flex items-center gap-3 rounded-card border bg-card p-3 shadow-e1 transition-colors',
        active ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:bg-secondary',
      )}
    >
      <span className="relative size-16 shrink-0 overflow-hidden rounded-control bg-brand-soft">
        {b.logo ? (
          <ResponsiveImage src={b.logo} alt="" ratio="1" sizes="64px" className="size-full" />
        ) : (
          <span className="flex size-full items-center justify-center text-heading font-bold text-brand-soft-foreground">
            {(b.name || 'B').charAt(0)}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{b.name}</span>
        <span className="block truncate text-caption text-muted-foreground">
          {[cat, b.city].filter(Boolean).join(' · ')}
        </span>
        <span className="mt-1 flex items-center gap-2 text-caption">
          {rating > 0 && (
            <span className="inline-flex items-center gap-0.5 font-semibold">
              <Star className="size-3.5 fill-current text-warning-soft-foreground" aria-hidden />
              {rating.toFixed(1)}
              {reviews > 0 && (
                <span className="font-normal text-muted-foreground">({reviews})</span>
              )}
            </span>
          )}
          {km != null && (
            <span className="text-muted-foreground">
              {km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`}
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}

/**
 * Results as the familiar card grid, or as a split list + map (desktop) / map with a
 * pinned preview over a list (phones). Hovering a row lights up its pin; tapping a pin
 * selects the row and scrolls it into view.
 */
export function ResultsView({
  mode,
  items,
  distances,
  showLinks,
  onLinkClick,
  center,
  mapClassName = 'lg:top-20 lg:h-[calc(100dvh-7rem)]',
}: {
  mode: ResultsMode;
  items: any[];
  distances?: Map<string, number>;
  showLinks?: boolean;
  onLinkClick?: () => void;
  center?: { lat: number; lng: number } | null;
  /** Desktop sticky offset + height, so the map clears the page's own sticky header. */
  mapClassName?: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLAnchorElement>());
  const points = useMemo(() => pointsFrom(items), [items]);

  useEffect(() => {
    if (picked && !items.some((b) => b.id === picked)) setPicked(null);
  }, [items, picked]);

  if (mode === 'list')
    return (
      <ResultsGrid
        items={items}
        distances={distances}
        showLinks={showLinks}
        onLinkClick={onLinkClick}
      />
    );

  const pickedItem = picked ? items.find((b) => b.id === picked) : null;
  const onPin = (id: string) => {
    setPicked(id);
    setActive(id);
    rows.current.get(id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      <div className={cn('relative order-1 h-[55dvh] min-h-80 lg:order-2 lg:sticky', mapClassName)}>
        <BusinessMap
          points={points}
          activeId={active ?? picked}
          onSelect={onPin}
          center={center}
          className="h-full"
        />
        {pickedItem && (
          <div className="absolute inset-x-3 bottom-3 lg:hidden">
            <div className="relative">
              <Row
                b={pickedItem}
                km={distances?.get(pickedItem.id)}
                active={false}
                onHover={() => {}}
                innerRef={() => {}}
              />
              <button
                type="button"
                onClick={() => setPicked(null)}
                aria-label="Close preview"
                className="absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-full border border-border bg-card shadow-e2"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      <ul
        className="order-2 space-y-2 lg:order-1"
        aria-label="Results"
        onClickCapture={onLinkClick}
      >
        {items.map((b) => (
          <li key={b.id}>
            <Row
              b={b}
              km={distances?.get(b.id)}
              active={b.id === (active ?? picked)}
              onHover={setActive}
              innerRef={(el) => {
                if (el) rows.current.set(b.id, el);
                else rows.current.delete(b.id);
              }}
            />
          </li>
        ))}
        {points.length < items.length && (
          <li className="px-1 pt-1 text-caption text-muted-foreground">
            {items.length - points.length} of {items.length} results have no map location yet.
          </li>
        )}
      </ul>
    </div>
  );
}
