'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { SkeletonRegion, Skel } from '@/components/common/skeletons';
import { FALLBACK_CATEGORIES, iconForCategory, type HomeCategory } from './home-data';

/**
 * Airbnb-style category bar: one horizontal row of icon + label stops that
 * scrolls on every screen size, with arrow buttons on pointer devices.
 * Keeps the home page's first screen for content instead of a 20-tile grid.
 */
export function CategoryRow({
  categories,
  loading,
}: {
  categories: HomeCategory[];
  loading: boolean;
}) {
  const list = categories.length > 0 ? categories : loading ? [] : FALLBACK_CATEGORIES;
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = () => {
    const el = scroller.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 24,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 24,
    });
  };
  useEffect(() => {
    measure();
    const el = scroller.current;
    if (!el) return;
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [list.length]);

  const nudge = (dir: 1 | -1) =>
    scroller.current?.scrollBy({
      left: dir * scroller.current.clientWidth * 0.8,
      behavior: 'smooth',
    });

  return (
    <nav aria-label="Browse by category" className="relative mb-10 md:mb-12">
      {list.length === 0 ? (
        <SkeletonRegion label="Loading categories" className="flex gap-4 overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skel key={i} className="h-[76px] w-[84px] shrink-0 rounded-2xl" />
          ))}
        </SkeletonRegion>
      ) : (
        <>
          <div
            ref={scroller}
            className="ui-scroll-x flex gap-1 border-b border-border/70 pb-2 sm:mx-0! sm:px-0!"
          >
            <Link
              href="/category"
              className="group flex w-[84px] shrink-0 flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-center"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-foreground text-background">
                <LayoutGrid className="size-5" aria-hidden />
              </span>
              <span className="line-clamp-2 text-caption font-semibold text-foreground">All</span>
            </Link>
            {list.map((c) => {
              const Icon = iconForCategory(c);
              const count = Number(c.listingsCount) || 0;
              return (
                <Link
                  key={c.slug}
                  href={`/category?type=${encodeURIComponent(c.slug)}`}
                  title={
                    count ? `${c.name} · ${count} ${count === 1 ? 'listing' : 'listings'}` : c.name
                  }
                  className="group flex w-[84px] shrink-0 flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-center"
                >
                  <span className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground transition-[background-color,transform] duration-200 group-hover:scale-105 group-hover:bg-primary/15 motion-reduce:group-hover:scale-100">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="line-clamp-2 text-caption font-medium leading-tight text-muted-foreground group-hover:text-foreground">
                    {c.name}
                  </span>
                </Link>
              );
            })}
          </div>
          {!edges.start && (
            <button
              type="button"
              onClick={() => nudge(-1)}
              aria-label="Scroll categories left"
              className="absolute -left-3 top-6 hidden size-9 items-center justify-center rounded-full border border-border bg-card shadow-e2 hover:bg-secondary md:flex"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
          {!edges.end && (
            <button
              type="button"
              onClick={() => nudge(1)}
              aria-label="Scroll categories right"
              className="absolute -right-3 top-6 hidden size-9 items-center justify-center rounded-full border border-border bg-card shadow-e2 hover:bg-secondary md:flex"
            >
              <ChevronRight className="size-4" />
            </button>
          )}
        </>
      )}
    </nav>
  );
}
