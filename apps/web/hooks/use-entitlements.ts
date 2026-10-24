'use client';

import { useCallback } from 'react';
import { useCachedGet, invalidateCachedGet } from '@/lib/use-cached-get';
import { useOwnerBusiness } from '@/hooks/use-owner-business';

export interface PlanEntitlements {
  businessId: string;
  /** 'FREE' or the bundle code (SINGLE, SINGLE_AN, MULTI, MULTI_AN, or a grandfathered legacy code). */
  plan: string;
  cycle: 'MONTHLY' | 'YEARLY' | 'QUARTERLY' | null;
  source: 'FREE' | 'PLAN' | 'LEGACY';
  /** Live-at-once limits. */
  offers: number;
  vouchers: number;
  analytics: boolean;
  /** Soonest end date among live paid rows; null on Free. */
  expiresAt: string | null;
  addons: { code: string; quantity: number; expiresAt: string }[];
  usage: { offers: number; vouchers: number };
  /** How many live items exceed the limit (non-zero right after a downgrade, before the nightly pause). */
  overLimit: { offers: number; vouchers: number };
}

const keyFor = (businessId: string) => `/v1/subscriptions/businesses/${businessId}/entitlements`;

/** Call after a purchase, a payment verification or an offer/voucher change so the numbers refresh. */
export function invalidateEntitlements(businessId?: string) {
  invalidateCachedGet(businessId ? keyFor(businessId) : '/v1/subscriptions/businesses/');
}

/**
 * The signed-in owner's current plan limits and live usage for the ACTIVE outlet (or an explicit
 * business id). Cached for 30 s; `refresh()` forces a re-read.
 */
export function useEntitlements(explicitBusinessId?: string) {
  const { business } = useOwnerBusiness(!explicitBusinessId);
  const businessId = explicitBusinessId ?? business?.id ?? null;
  const { data, loading, error, refresh } = useCachedGet<PlanEntitlements>(
    businessId ? keyFor(businessId) : null,
    { ttlMs: 30_000 },
  );

  const reload = useCallback(async () => {
    if (businessId) invalidateEntitlements(businessId);
    await refresh();
  }, [businessId, refresh]);

  // The API wraps nothing here, but tolerate a { data } envelope like the other endpoints.
  const raw: any = data && (data as any).data && !(data as any).plan ? (data as any).data : data;
  // Only trust a complete answer; anything else (an error body, an older API) counts as unknown
  // rather than crashing every screen that reads limits.
  const ent: PlanEntitlements | null =
    raw && typeof raw.offers === 'number' && raw.usage && typeof raw.usage === 'object'
      ? {
          ...raw,
          overLimit: raw.overLimit ?? { offers: 0, vouchers: 0 },
        }
      : null;

  return {
    ent,
    loading,
    error,
    refresh: reload,
    isFree: ent ? ent.plan === 'FREE' && ent.offers <= 1 && ent.vouchers === 0 : false,
    canAddOffer: ent ? ent.usage.offers < ent.offers : true,
    canAddVoucher: ent ? ent.usage.vouchers < ent.vouchers : true,
    hasAnalytics: ent ? ent.analytics : true,
  };
}
