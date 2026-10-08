'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Package, UtensilsCrossed, X } from 'lucide-react';
import { ResponsiveImage } from '@/components/common/responsive-image';
import { useCachedGet } from '@/lib/use-cached-get';
import { SectionCard, SectionHeading } from './profile-ui';
import { SectionSkeleton } from './profile-skeletons';
import { asList, formatPrice } from './profile-utils';

function firstImage(p: any): string | null {
  const imgs = p?.images;
  if (!Array.isArray(imgs) || imgs.length === 0) return null;
  const f = imgs[0];
  if (typeof f === 'string') return f;
  return typeof f?.url === 'string' ? f.url : null;
}

const PRODUCTS_PREVIEW = 8;

export function MenuSection({
  biz,
  businessId,
  menuPhotos,
  productCount,
}: {
  biz: any;
  businessId: string;
  menuPhotos: any[];
  productCount: number;
}) {
  const [viewing, setViewing] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const prodQ = useCachedGet<any>(productCount > 0 ? `/v1/products/business/${businessId}` : null, { ttlMs: 60_000 });
  const products = useMemo(() => asList(prodQ.data).filter((p) => p && p.isAvailable !== false), [prodQ.data]);

  const hasPhotos = menuPhotos.length > 0;
  const title = hasPhotos ? 'Menu' : 'Products';

  const step = useCallback(
    (dir: 1 | -1) => setViewing((i) => (i == null ? i : (i + dir + menuPhotos.length) % menuPhotos.length)),
    [menuPhotos.length],
  );

  useEffect(() => {
    if (viewing == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewing(null);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewing, step]);

  const viewingPhoto = viewing != null ? menuPhotos[viewing] : null;
  const visibleProducts = showAll ? products : products.slice(0, PRODUCTS_PREVIEW);

  return (
    <section id="menu" aria-label={title} className="mb-6 scroll-mt-16 lg:col-start-1">
      <SectionCard>
        <SectionHeading icon={hasPhotos ? UtensilsCrossed : Package} title={title} />

        {/* ── Food menu photos (food businesses that have uploaded any) */}
        {hasPhotos && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {menuPhotos.map((p: any, i: number) => (
              <button
                key={p.id || i}
                type="button"
                onClick={() => setViewing(i)}
                className="ui-fade-up ui-press group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-muted"
                style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}
                aria-label={p.title ? `View menu photo: ${p.title}` : 'View menu photo'}
              >
                <ResponsiveImage
                  src={p.publicUrl}
                  alt={p.title || `${biz.name} menu`}
                  ratio="1"
                  sizes="(max-width: 640px) 50vw, 220px"
                  imgClassName="group-hover:scale-105 motion-reduce:transition-none"
                  fallback={<UtensilsCrossed className="h-6 w-6" />}
                />
                {p.title && (
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1 text-[11px] font-medium text-white">
                    {p.title}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Product list */}
        {productCount > 0 && (
          <div className={hasPhotos ? 'mt-6' : undefined}>
            {hasPhotos && <h3 className="mb-3 text-base font-bold text-foreground">Products</h3>}
            {prodQ.loading && products.length === 0 ? (
              <SectionSkeleton rows={3} />
            ) : products.length > 0 ? (
              <>
                <ul className="divide-y divide-border">
                  {visibleProducts.map((p: any, i: number) => {
                    const img = firstImage(p);
                    const price = formatPrice(p.price);
                    return (
                      <li key={p.id || i} className="flex items-center gap-3 py-3">
                        {img && (
                          <ResponsiveImage
                            src={img}
                            alt={p.name || ''}
                            ratio="1"
                            className="h-16 w-16 shrink-0 rounded-xl"
                            sizes="64px"
                            fallback={<Package className="h-5 w-5" />}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold text-foreground">{p.name}</p>
                          {p.description && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                          )}
                        </div>
                        {price && <span className="shrink-0 text-sm font-bold text-foreground">{price}</span>}
                      </li>
                    );
                  })}
                </ul>
                {products.length > PRODUCTS_PREVIEW && (
                  <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    className="mt-2 min-h-11 w-full cursor-pointer rounded-xl text-sm font-semibold text-primary hover:bg-primary/5"
                  >
                    {showAll ? 'Show fewer' : `Show all ${products.length} products`}
                  </button>
                )}
              </>
            ) : null}
          </div>
        )}
      </SectionCard>

      {/* ── MENU PHOTO LIGHTBOX */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Menu photo"
          onClick={() => setViewing(null)}
        >
          <button
            type="button"
            onClick={() => setViewing(null)}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <X className="h-5 w-5" />
          </button>
          {menuPhotos.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={viewingPhoto.id || viewing}
            src={viewingPhoto.publicUrl}
            alt={viewingPhoto.title || `${biz.name} menu`}
            className="ui-pop max-h-[85vh] max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
