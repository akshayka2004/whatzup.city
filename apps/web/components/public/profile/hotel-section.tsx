'use client';

import { HOTEL_AMENITIES } from '@/lib/hotel-pricing';
import { labelsFor } from '@/components/business/amenity-details-editor';
import { SectionCard } from './profile-ui';

/**
 * Hotel classification + selected amenities (Hotel category only). Loaded on
 * demand: it drags in the amenity editor's label helpers, which nobody else
 * on the page needs.
 */
export default function HotelSection({ biz }: { biz: any }) {
  const selected = HOTEL_AMENITIES.filter((a) => (biz.hotelAmenities || {})[a.key]?.selected);
  const details = biz.amenityDetails || {};

  return (
    <SectionCard className="ui-fade-up">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">Hotel</h2>
        {biz.hotelStarRating && (
          <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            {biz.hotelStarRating}★ classification
          </span>
        )}
      </div>
      {selected.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {selected.map((a) => {
            const items = Array.isArray(details[a.key]) ? details[a.key] : [];
            const labels = labelsFor(a.key);
            return (
              <div key={a.key} className="rounded-xl border border-border bg-secondary/50 p-3">
                <div className="text-sm font-semibold text-foreground">{a.label}</div>
                {a.subOptions && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{a.subOptions.join(' · ')}</div>
                )}
                {items.length > 0 && (
                  <div className="mt-2.5 space-y-2 border-t border-border pt-2.5">
                    {items.map((item: any) => (
                      <div key={item.id}>
                        <div className="break-words text-xs font-semibold text-foreground">{item.title}</div>
                        <div className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
                          {item.capacity && (
                            <span>
                              {labels.capacity}: {item.capacity}
                            </span>
                          )}
                          {item.price && (
                            <span>
                              {labels.price}: {item.price}
                            </span>
                          )}
                        </div>
                        {Array.isArray(item.features) && item.features.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.features.map((f: string, i: number) => (
                              <span
                                key={i}
                                className="break-words rounded-full bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
