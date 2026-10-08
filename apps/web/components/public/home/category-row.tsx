'use client';

import Link from 'next/link';
import { SectionHeader } from './section-header';
import { SkeletonRegion, Skel } from '@/components/common/skeletons';
import { FALLBACK_CATEGORIES, iconForCategory, type HomeCategory } from './home-data';

/**
 * Category tiles: a swipeable icon row on phones, a grid from md up.
 * `.ui-scroll-x` is unlayered CSS, so the md: resets below need `!` to win.
 */
export function CategoryRow({ categories, loading }: { categories: HomeCategory[]; loading: boolean }) {
  const list = categories.length > 0 ? categories : loading ? [] : FALLBACK_CATEGORIES;

  return (
    <section className="mb-10 md:mb-14">
      <SectionHeader
        title="Browse Categories"
        subtitle="Explore services and listings filtered by sector"
        href="/category"
        linkLabel="View all"
      />

      {list.length === 0 ? (
        <SkeletonRegion
          label="Loading categories"
          className="ui-scroll-x flex gap-3 md:grid md:grid-cols-4 lg:grid-cols-5 md:overflow-visible! md:mx-0! md:px-0!"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <Skel key={i} className="h-[104px] w-[92px] shrink-0 rounded-2xl md:h-[68px] md:w-auto" />
          ))}
        </SkeletonRegion>
      ) : (
        <div className="ui-scroll-x ui-stagger flex gap-3 pb-1 md:grid md:grid-cols-4 md:gap-3 md:pb-0 lg:grid-cols-5 md:overflow-visible! md:mx-0! md:px-0!">
          {list.map((c) => {
            const Icon = iconForCategory(c);
            const count = Number(c.listingsCount) || 0;
            return (
              <div key={c.slug} className="shrink-0 md:shrink">
                <Link
                  href={`/category?type=${encodeURIComponent(c.slug)}`}
                  className="ui-lift ui-press group flex h-full min-h-[104px] w-[92px] flex-col items-center gap-2 rounded-2xl border border-border bg-card px-2 py-3 text-center md:min-h-0 md:w-auto md:flex-row md:gap-3 md:px-4 md:py-3.5 md:text-left"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/12 transition-colors group-hover:bg-primary/20">
                    <Icon className="h-5 w-5 text-primary" />
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 block text-xs font-bold leading-tight text-foreground md:text-sm">
                      {c.name}
                    </span>
                    {count > 0 && (
                      <span className="mt-0.5 hidden text-[11px] text-muted-foreground md:block">
                        {count.toLocaleString('en-IN')} {count === 1 ? 'listing' : 'listings'}
                      </span>
                    )}
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
