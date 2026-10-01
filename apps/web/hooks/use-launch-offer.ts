'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiService } from '@/lib/services/api-service';

interface LaunchOfferStatus {
  enabled: boolean;
  slotsPerCategory: number;
  packageName: string;
  price: number;
  durationDays: number;
  /** Slots already used, keyed by category slug. */
  claimed: Record<string, number>;
}

/** Live launch-offer counter for the registration page. */
export function useLaunchOffer() {
  const [status, setStatus] = useState<LaunchOfferStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await apiService.get<LaunchOfferStatus>('/v1/subscriptions/launch-offer');
    // A failed lookup just hides the offer; registration itself is unaffected.
    setStatus(res.error || !res.data ? null : res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enabled = !!status?.enabled;
  const slotsLeft = (categorySlug: string) =>
    status ? Math.max(0, status.slotsPerCategory - (status.claimed[categorySlug] || 0)) : 0;

  return { loading, enabled, status, slotsLeft, refresh };
}
