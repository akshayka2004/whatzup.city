'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Store } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';

interface PublicOutlet {
  id: string;
  name: string;
  slug?: string;
  outletLabel?: string | null;
  city?: string | null;
  district?: string | null;
  logo?: string | null;
}

/** Small "Part of <brand>" pill for the public business header. */
export function BrandPublicChip({ brand }: { brand?: { name: string } | null }) {
  if (!brand?.name) return null;
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <Store className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="truncate">Part of {brand.name}</span>
    </span>
  );
}

/** Sibling outlets of the same brand. Renders nothing when there are none or the lookup fails. */
export function OtherOutlets({ brandId, currentBusinessId }: { brandId?: string | null; currentBusinessId: string }) {
  const [outlets, setOutlets] = useState<PublicOutlet[]>([]);

  useEffect(() => {
    if (!brandId) return;
    let alive = true;
    apiService.get<any>(`/v1/brands/${brandId}/outlets/public`).then((res) => {
      if (!alive || res.error) return;
      const list: PublicOutlet[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setOutlets(list.filter((o) => o.id !== currentBusinessId));
    });
    return () => {
      alive = false;
    };
  }, [brandId, currentBusinessId]);

  if (!brandId || outlets.length === 0) return null;

  return (
    <section aria-label="Other outlets" className="space-y-3 ui-fade-up">
      <h2 className="text-base font-bold text-foreground">Other outlets</h2>
      <div className="ui-scroll-x flex gap-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {outlets.map((o) => (
          <Link
            key={o.id}
            href={`/business/${o.id}`}
            className="ui-press flex min-h-16 w-64 shrink-0 items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:border-primary/40 sm:w-auto"
          >
            {o.logo ? (
              <img src={o.logo} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Store className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{o.outletLabel?.trim() || o.name}</p>
              {(o.city || o.district) && (
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {o.city || o.district}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
