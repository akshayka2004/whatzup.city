'use client';

import { useEffect, useRef } from 'react';
import { trackImpression } from './track';

/** Attach to a listing card: records one LISTING_IMPRESSION when half of it is on screen. */
export function useImpression<T extends Element>(businessId: string | undefined, source?: string) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !businessId || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          trackImpression(businessId, source);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [businessId, source]);
  return ref;
}
