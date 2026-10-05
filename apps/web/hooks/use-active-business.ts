'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';
import {
  invalidateOwnerBusinessCache,
  loadOwnerBusinessList,
  type OwnerBusiness,
} from '@/hooks/use-owner-business';

export interface BrandOutlet {
  id: string;
  name: string;
  slug: string;
  outletLabel: string | null;
  isBrandHq: boolean;
  status: string;
  city?: string | null;
  logo?: string | null;
  billSeriesPrefix?: string | null;
  launchOfferClaimedAt?: string | null;
  createdAt?: string;
  category?: { name: string; slug: string } | null;
  subscription?: { packageName: string; status: string; endDate?: string | null } | null;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED';
  billSeriesMode: 'SHARED' | 'PER_OUTLET';
  billSeriesPrefix?: string | null;
}

export interface BrandMine {
  brand: Brand;
  outlets: BrandOutlet[];
}

interface Snapshot {
  brandMine: BrandMine | null;
  owned: OwnerBusiness[];
  activeBusinessId: string | null;
}

// One shared request pair per signed-in user, like use-owner-business.
let cached: Promise<Snapshot | null> | null = null;
let cachedForUser: string | null = null;

/** Drop cached brand/outlet state (after adding, removing, renaming or converting). */
export function invalidateActiveBusinessCache() {
  cached = null;
  cachedForUser = null;
  invalidateOwnerBusinessCache();
}

function loadSnapshot(userId: string): Promise<Snapshot | null> {
  if (!cached || cachedForUser !== userId) {
    cachedForUser = userId;
    const request: Promise<Snapshot | null> = Promise.all([
      apiService.get<any>('/v1/brands/mine'),
      loadOwnerBusinessList(userId),
    ]).then(([brandRes, owned]) => {
      if (!owned) {
        if (cached === request) cached = null;
        return null;
      }
      const raw = brandRes.error ? null : brandRes.data?.brand ? brandRes.data : brandRes.data?.data;
      const brandMine: BrandMine | null = raw?.brand ? { brand: raw.brand, outlets: raw.outlets ?? [] } : null;
      return { brandMine, owned: owned.list, activeBusinessId: owned.activeBusinessId };
    });
    cached = request;
  }
  return cached;
}

export function useActiveBusiness(enabled = true) {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!enabled || !user?.id) return () => {};
    let alive = true;
    loadSnapshot(user.id).then((s) => {
      if (!alive) return;
      setSnapshot(s);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [enabled, user?.id]);

  useEffect(() => load(), [load]);

  const refresh = useCallback(async () => {
    invalidateActiveBusinessCache();
    if (!user?.id) return;
    const s = await loadSnapshot(user.id);
    setSnapshot(s);
    setLoading(false);
  }, [user?.id]);

  const switchOutlet = useCallback(
    async (businessId: string, redirectTo?: string): Promise<{ ok: boolean; error?: string }> => {
      const res = await apiService.put<any>('/v1/auth/active-business', { businessId });
      if (res.error) return { ok: false, error: res.error };
      invalidateActiveBusinessCache();
      // Every dashboard page reads its business on mount; a full load is the one way to guarantee they all do.
      if (typeof window !== 'undefined') {
        if (redirectTo) window.location.assign(redirectTo);
        else window.location.reload();
      }
      return { ok: true };
    },
    [],
  );

  const activeBusinessId = snapshot?.activeBusinessId ?? snapshot?.owned[0]?.id ?? null;
  const activeBusiness = snapshot?.owned.find((b) => b.id === activeBusinessId) ?? snapshot?.owned[0] ?? null;

  return {
    brand: snapshot?.brandMine?.brand ?? null,
    outlets: snapshot?.brandMine?.outlets ?? [],
    owned: snapshot?.owned ?? [],
    activeBusiness,
    activeBusinessId,
    isBrand: !!snapshot?.brandMine,
    loading,
    switchOutlet,
    refresh,
  };
}
