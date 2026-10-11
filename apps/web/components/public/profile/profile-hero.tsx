'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BadgeCheck, Images, MapPin, Star, Store } from 'lucide-react';
import { getOpenStatus, hasOperatingHours } from '@saas/types';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { ResponsiveImage } from '@/components/common/responsive-image';
import { StatusPill } from '@/components/common/status-pill';
import { BrandPublicChip } from '@/components/business/brand-public-section';
import { cn } from '@/lib/utils';
import { DesktopActions } from './profile-actions';
import type { ProfileActions } from './use-profile-actions';
import { toNum } from './profile-utils';

type Slide = { src: string; alt: string };

/** Live "open now" state. Depends on the viewer's clock, so it is computed after mount. */
function useOpenStatus(hours: unknown) {
  const [status, setStatus] = useState<{ isOpen: boolean; label: string } | null>(null);
  useEffect(() => {
    if (!hasOperatingHours(hours)) {
      setStatus(null);
      return;
    }
    const tick = () => {
      const s = getOpenStatus(hours);
      setStatus(s ? { isOpen: s.isOpen, label: s.label } : null);
    };
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [hours]);
  return status;
}

function Gallery({ slides, name, onBack }: { slides: Slide[]; name: string; onBack: () => void }) {
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!api) return;
    const sync = () => setIndex(api.selectedScrollSnap());
    sync();
    api.on('select', sync);
    api.on('reInit', sync);
    return () => {
      api.off('select', sync);
      api.off('reInit', sync);
    };
  }, [api]);

  const many = slides.length > 1;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-muted">
      {slides.length === 0 ? (
        <div className="flex h-36 items-center justify-center bg-gradient-to-br from-primary/15 via-secondary to-card sm:h-48">
          <span className="text-6xl font-black text-primary/25 sm:text-7xl" aria-hidden>
            {name.trim().charAt(0).toUpperCase()}
          </span>
        </div>
      ) : (
        <Carousel
          setApi={setApi}
          opts={{ loop: many, align: 'start' }}
          className="group"
          aria-label={`${name} photos`}
        >
          <CarouselContent className="ml-0">
            {slides.map((s, i) => (
              <CarouselItem key={s.src + i} className="pl-0">
                <ResponsiveImage
                  src={s.src}
                  alt={s.alt}
                  ratio="4 / 3"
                  className="aspect-[4/3]! rounded-none sm:aspect-[5/2]!"
                  sizes="(max-width: 1024px) 100vw, 1024px"
                  priority={i === 0}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          {many && (
            <>
              <CarouselPrevious className="left-3 hidden h-11 w-11 border-0 bg-black/40 text-white backdrop-blur hover:bg-black/60 hover:text-white md:inline-flex" />
              <CarouselNext className="right-3 hidden h-11 w-11 border-0 bg-black/40 text-white backdrop-blur hover:bg-black/60 hover:text-white md:inline-flex" />
            </>
          )}
        </Carousel>
      )}

      {/* Scrim keeps the dots / counter readable on bright photos. */}
      {slides.length > 0 && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent"
          aria-hidden
        />
      )}

      <button
        type="button"
        onClick={onBack}
        aria-label="Go back"
        className="ui-press absolute left-3 top-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/60"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {many && (
        <>
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            <Images className="h-3.5 w-3.5" />
            {index + 1} / {slides.length}
          </div>
          <div
            className="absolute inset-x-0 bottom-3.5 flex justify-center gap-1.5"
            role="group"
            aria-label="Choose photo"
          >
            {slides.map((s, i) => (
              <button
                key={s.src + i}
                type="button"
                aria-current={i === index}
                aria-label={`Photo ${i + 1}`}
                onClick={() => api?.scrollTo(i)}
                className="flex h-5 w-4 cursor-pointer items-center justify-center"
              >
                <span
                  className={cn(
                    'block h-1.5 rounded-full bg-white transition-all duration-300 motion-reduce:transition-none',
                    i === index ? 'w-4 opacity-100' : 'w-1.5 opacity-60',
                  )}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ProfileHero({
  biz,
  menuPhotos,
  actions,
  avgRating,
  reviewCount,
  onBack,
  onJump,
}: {
  biz: any;
  menuPhotos: any[];
  actions: ProfileActions;
  avgRating: number;
  reviewCount: number;
  onBack: () => void;
  onJump: (id: string) => void;
}) {
  const openStatus = useOpenStatus(biz.operatingHours);

  const slides = useMemo<Slide[]>(() => {
    const out: Slide[] = [];
    if (typeof biz.coverImage === 'string' && biz.coverImage)
      out.push({ src: biz.coverImage, alt: `${biz.name} cover photo` });
    for (const p of menuPhotos.slice(0, 6)) {
      if (p?.publicUrl) out.push({ src: p.publicUrl, alt: p.title || `${biz.name} menu` });
    }
    return out;
  }, [biz.coverImage, biz.name, menuPhotos]);

  const rating = toNum(avgRating);
  const place = biz.city || biz.district || '';

  return (
    <header>
      <div className="relative">
        <Gallery slides={slides} name={biz.name || ''} onBack={onBack} />

        {/* Logo straddles the gallery edge */}
        <div className="absolute -bottom-9 left-4 h-[4.5rem] w-[4.5rem] overflow-hidden rounded-2xl border-4 border-background bg-card ui-elev-2 sm:-bottom-12 sm:left-6 sm:h-24 sm:w-24">
          {biz.logo ? (
            <ResponsiveImage
              src={biz.logo}
              alt={`${biz.name} logo`}
              ratio="1"
              className="h-full w-full rounded-none bg-card"
              imgClassName="object-contain"
              sizes="96px"
              priority
              fallback={<Store className="h-7 w-7 text-primary" />}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-brand-soft text-2xl font-black text-brand-soft-foreground sm:text-3xl">
              {(biz.name || '?').trim().charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div className="pt-12 sm:pt-14 md:flex md:items-start md:justify-between md:gap-6">
        <div className="ui-fade-up min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {biz.isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/15 px-2.5 py-0.5 text-xs font-semibold leading-5 text-success-foreground dark:text-success">
                <BadgeCheck className="h-3.5 w-3.5" />
                Verified Merchant
              </span>
            )}
            {openStatus && (
              <StatusPill
                tone={openStatus.isOpen ? 'success' : 'neutral'}
                live={openStatus.isOpen}
                label={openStatus.label}
                className="ui-pop"
              />
            )}
            {biz.halalStatus && (
              <StatusPill
                tone={biz.halalStatus === 'HALAL' ? 'success' : 'warning'}
                label={biz.halalStatus === 'HALAL' ? 'Halal' : 'Non-Halal'}
              />
            )}
          </div>

          <h1 className="break-words text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            {biz.name}
          </h1>

          <p className="text-sm text-muted-foreground sm:text-base">
            {biz.category?.name || ''}
            {biz.subcategory ? ` • ${biz.subcategory}` : ''}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            <button
              type="button"
              onClick={() => onJump('reviews')}
              className="ui-press inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg"
              aria-label={
                rating > 0
                  ? `Rated ${rating.toFixed(1)}, ${reviewCount} reviews. Jump to reviews`
                  : 'No reviews yet. Jump to reviews'
              }
            >
              {rating > 0 ? (
                <>
                  <Star className="h-5 w-5 fill-warning text-warning-soft-foreground" />
                  <span className="text-lg font-bold text-foreground">{rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({reviewCount} reviews)</span>
                </>
              ) : (
                <span className="text-muted-foreground">No reviews yet</span>
              )}
            </button>
            {place && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                {place}
              </span>
            )}
          </div>

          {biz.brand && (
            <div className="pt-0.5">
              <BrandPublicChip brand={biz.brand} />
            </div>
          )}
        </div>

        <DesktopActions
          actions={actions}
          className="mt-5 hidden md:mt-0 md:flex md:max-w-[26rem] md:justify-end"
        />
      </div>
    </header>
  );
}
