'use client';

import { useI18n } from '@/lib/i18n/provider';

import { type ReactNode } from 'react';
import { BusinessCard } from '@/components/business-card';
import Link from 'next/link';
import { CalendarDays, Clapperboard, MapPin, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResponsiveImage } from '@/components/common/responsive-image';
import {
  BusinessCardSkeleton,
  OfferCardSkeleton,
  Skel,
  SkeletonRegion,
} from '@/components/common/skeletons';
import { SectionHeader } from './section-header';
import { asStrings, discountText, eventPrice, fmtDay, fmtShortDate, listOf } from './home-data';

/* ────────────── shared strip primitives ────────────── */

// Phones: a swipeable row. md+: a grid. `.ui-scroll-x` is unlayered, hence the `!` resets.
const ROW =
  'ui-scroll-x flex gap-3 pb-1 md:grid md:gap-4 md:pb-0 md:overflow-visible! md:mx-0! md:px-0!';

/**
 * One card position in a strip. `ui-cv-auto` skips rendering while off-screen and
 * paint-contains its box, so on md+ (where hover-lift shadows spill out) the slot
 * pads itself and cancels the padding with negative margins.
 */
function Slot({ width, height, children }: { width: string; height: number; children: ReactNode }) {
  return (
    <div
      className={cn(
        'ui-cv-auto shrink-0 md:w-auto md:-mx-2 md:-mt-2 md:-mb-6 md:px-2 md:pt-2 md:pb-6',
        width,
      )}
      style={{ containIntrinsicSize: `auto ${height}px` }}
    >
      {children}
    </div>
  );
}

const CARD =
  'ui-lift ui-press group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm';

function Strip({
  title,
  subtitle,
  href,
  items,
  loading,
  cols,
  skeleton,
  children,
}: {
  title: string;
  subtitle?: string;
  href: string;
  items: unknown[];
  loading: boolean;
  cols: string;
  skeleton: ReactNode;
  children: ReactNode;
}) {
  // Hidden when there is nothing to show.
  if (items.length === 0 && !loading) return null;
  return (
    <section className="mb-10 md:mb-14">
      <SectionHeader title={title} subtitle={subtitle} href={href} />
      {items.length === 0 ? (
        <SkeletonRegion label={`Loading ${title.toLowerCase()}`} className={cn(ROW, cols)}>
          {skeleton}
        </SkeletonRegion>
      ) : (
        <div className={cn(ROW, 'ui-stagger', cols)}>{children}</div>
      )}
    </section>
  );
}

function SkeletonSlots({
  width,
  children,
  count = 4,
}: {
  width: string;
  children: ReactNode;
  count?: number;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn('shrink-0 md:w-auto', width)}>
          {children}
        </div>
      ))}
    </>
  );
}

/* ────────────── trending offers ────────────── */

export function TrendingOffers({ body, loading }: { body: unknown; loading: boolean }) {
  const { t } = useI18n();
  const items = listOf(body).slice(0, 8);
  const W = 'w-[78%] sm:w-72';
  return (
    <Strip
      title={t('home.trendingOffers')}
      subtitle={t('home.trendingOffersSub')}
      href="/offers"
      items={items}
      loading={loading}
      cols="md:grid-cols-3 lg:grid-cols-4"
      skeleton={
        <SkeletonSlots width={W}>
          <OfferCardSkeleton />
        </SkeletonSlots>
      }
    >
      {items.map((o: any) => {
        const biz = o.business ?? {};
        const discount = discountText(o);
        const claimed = Number(o._count?.redemptions ?? o.currentRedemptions ?? 0);
        const ends = fmtShortDate(o.endDate);
        // Same destination the offers page itself uses for "view business offers".
        const href = biz.id ? `/business/${biz.id}#offers-section` : '/offers';
        return (
          <Slot key={o.id ?? `${biz.id}-${o.title}`} width={W} height={236}>
            <Link href={href} className={CARD}>
              <div className="flex items-start gap-3 bg-primary/8 px-4 pb-3 pt-4">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-border bg-card">
                  <ResponsiveImage
                    src={biz.logo}
                    alt=""
                    ratio="1"
                    sizes="40px"
                    fallback={<Tag className="h-4 w-4 text-primary" />}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-muted-foreground">
                    {biz.name || 'Local business'}
                  </p>
                  <p className="text-xl font-black leading-tight tabular-nums text-primary">
                    {discount || 'Special offer'}
                  </p>
                </div>
                {o.code && (
                  <span className="shrink-0 rounded-lg border border-primary/20 bg-card px-2 py-1 font-mono text-xs font-extrabold text-primary">
                    {o.code}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-4">
                <p className="line-clamp-1 text-sm font-bold text-foreground">
                  {o.title || o.name}
                </p>
                {o.description && (
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {o.description}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
                  <span>{ends ? `Ends ${ends}` : ''}</span>
                  {claimed > 0 && (
                    <span className="font-semibold text-foreground/70">
                      {claimed.toLocaleString('en-IN')} claimed
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </Slot>
        );
      })}
    </Strip>
  );
}

/* ────────────── trending businesses ────────────── */

export function TrendingBusinesses({ body, loading }: { body: unknown; loading: boolean }) {
  const { t } = useI18n();
  const items = listOf(body).slice(0, 8);
  const W = 'w-[72%] sm:w-64';

  return (
    <Strip
      title={t('home.trendingBusinesses')}
      subtitle={t('home.trendingBusinessesSub')}
      href="/search"
      items={items}
      loading={loading}
      cols="md:grid-cols-3 lg:grid-cols-4"
      skeleton={
        <SkeletonSlots width={W}>
          <BusinessCardSkeleton />
        </SkeletonSlots>
      }
    >
      {items.map((b: any, i: number) => (
        <Slot key={b.id} width={W} height={248}>
          <BusinessCard business={b} priority={i < 2} />
        </Slot>
      ))}
    </Strip>
  );
}

/* ────────────── upcoming events ────────────── */

export function UpcomingEvents({ body, loading }: { body: unknown; loading: boolean }) {
  const { t } = useI18n();
  const items = listOf(body).slice(0, 6);
  const W = 'w-[78%] sm:w-72';
  return (
    <Strip
      title={t('home.events')}
      subtitle={t('home.eventsSub')}
      href="/events"
      items={items}
      loading={loading}
      cols="md:grid-cols-3"
      skeleton={
        <SkeletonSlots width={W} count={3}>
          <OfferCardSkeleton />
        </SkeletonSlots>
      }
    >
      {items.map((ev: any) => {
        const day = fmtDay(ev.startDate);
        const host = ev.business?.name || ev.hostLabel;
        const where = ev.venue || ev.city || ev.business?.city;
        const price = eventPrice(ev);
        return (
          <Slot key={ev.id} width={W} height={276}>
            <Link href={`/events/${ev.id}`} className={CARD}>
              <div className="relative">
                <ResponsiveImage
                  src={ev.posterImage}
                  alt={ev.title || 'Event poster'}
                  ratio="16 / 9"
                  sizes="(max-width: 768px) 78vw, 33vw"
                  imgClassName="group-hover:scale-105"
                  fallback={<CalendarDays className="h-8 w-8" />}
                />
                {day && (
                  <div className="absolute left-2.5 top-2.5 rounded-xl border border-border bg-card/95 px-2.5 py-1 text-center leading-none shadow-sm">
                    <span className="block text-base font-black tabular-nums text-foreground">
                      {day.day}
                    </span>
                    <span className="block text-xs font-bold uppercase tracking-wide text-primary">
                      {day.month}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-4">
                <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground">
                  {ev.title}
                </h3>
                {host && <p className="truncate text-xs text-muted-foreground">by {host}</p>}
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  {where ? (
                    <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{where}</span>
                    </span>
                  ) : (
                    <span />
                  )}
                  <span
                    className={cn(
                      'shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold',
                      ev.ticketType === 'PAID'
                        ? 'bg-brand-soft text-brand-soft-foreground'
                        : 'bg-success/10 text-success-foreground dark:text-success',
                    )}
                  >
                    {price}
                  </span>
                </div>
              </div>
            </Link>
          </Slot>
        );
      })}
    </Strip>
  );
}

/* ────────────── now showing (movies) ────────────── */

export function NowShowing({ body, loading }: { body: unknown; loading: boolean }) {
  const { t } = useI18n();
  const items = listOf(body).slice(0, 6);
  const W = 'w-36 sm:w-40';
  return (
    <Strip
      title={t('home.movies')}
      subtitle={t('home.moviesSub')}
      href="/movies"
      items={items}
      loading={loading}
      cols="md:grid-cols-4 lg:grid-cols-6"
      skeleton={
        <SkeletonSlots width={W} count={6}>
          <div className="space-y-2">
            <Skel className="aspect-[2/3] w-full rounded-2xl" />
            <Skel className="h-4 w-3/4" />
            <Skel className="h-3.5 w-1/2" />
          </div>
        </SkeletonSlots>
      }
    >
      {items.map((m: any) => {
        const langs = asStrings(m.languages);
        const genres = asStrings(m.genres);
        const meta = (langs.length ? langs : genres).slice(0, 2).join(' · ');
        const mins = Number(m.durationMinutes) || 0;
        const runtime = mins > 0 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : '';
        return (
          <Slot key={m.id} width={W} height={330}>
            <Link href="/movies" className="ui-press group flex h-full flex-col">
              <div className="relative overflow-hidden rounded-2xl border border-border shadow-sm transition-[transform,box-shadow] duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
                <ResponsiveImage
                  src={m.posterImage}
                  alt={`${m.name} poster`}
                  ratio="2 / 3"
                  sizes="(max-width: 768px) 160px, 16vw"
                  imgClassName="group-hover:scale-105"
                  fallback={<Clapperboard className="h-8 w-8" />}
                />
                {m.certification && (
                  <span className="absolute left-2 top-2 rounded-md bg-card/95 px-1.5 py-0.5 text-xs font-bold text-foreground">
                    {m.certification}
                  </span>
                )}
              </div>
              <div className="px-0.5 pt-2">
                <h3 className="line-clamp-1 text-sm font-bold text-foreground">{m.name}</h3>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {[meta, runtime].filter(Boolean).join(' · ') || 'Now showing'}
                </p>
              </div>
            </Link>
          </Slot>
        );
      })}
    </Strip>
  );
}
