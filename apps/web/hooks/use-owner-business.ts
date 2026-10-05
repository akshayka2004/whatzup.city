'use client';

import { useEffect, useState } from 'react';
import type { OperatingHours } from '@saas/types';
import { apiService } from '@/lib/services/api-service';
import { isFoodCategory } from '@/lib/food-category';
import { useAuth } from '@/hooks/use-auth';

export interface OwnerBusinessBrand {
  id: string;
  name: string;
  slug: string;
  billSeriesMode: 'SHARED' | 'PER_OUTLET';
  billSeriesPrefix?: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface OwnerBusiness {
  id: string;
  name: string;
  status?: string;
  city?: string;
  category?: { id: string; name: string; slug: string } | null;
  brandId?: string | null;
  brand?: OwnerBusinessBrand | null;
  outletLabel?: string | null;
  isBrandHq?: boolean;
  operatingHours?: OperatingHours | null;
  brandPromptStatus?: 'SNOOZED' | 'DECLINED' | null;
  brandPromptAt?: string | null;
}

export interface OwnerBusinessList {
  list: OwnerBusiness[];
  activeBusinessId: string | null;
}

// One shared request per signed-in user, reused by the sidebar, the prompts, the outlet switcher and the menu page.
let cached: Promise<OwnerBusinessList | null> | null = null;
let cachedForUser: string | null = null;

/** Drop the cached owner/mine response (after switching outlets, adding one, or editing brand data). */
export function invalidateOwnerBusinessCache() {
  cached = null;
  cachedForUser = null;
}

/** The owner's businesses (active outlet first) behind a single in-flight request per user. */
export function loadOwnerBusinessList(userId: string): Promise<OwnerBusinessList | null> {
  if (!cached || cachedForUser !== userId) {
    cachedForUser = userId;
    const request: Promise<OwnerBusinessList | null> = apiService.get<any>('/v1/businesses/owner/mine').then((res) => {
      const body = res.data;
      const list: OwnerBusiness[] = Array.isArray(body) ? body : body?.data ?? [];
      if (res.error || !list.length) {
        if (cached === request) cached = null; // let a later mount retry
        return null;
      }
      const activeBusinessId: string = body?.activeBusinessId ?? body?.data?.activeBusinessId ?? list[0].id;
      return { list, activeBusinessId };
    });
    cached = request;
  }
  return cached;
}

export function useOwnerBusiness(enabled = true) {
  const { user } = useAuth();
  const [business, setBusiness] = useState<OwnerBusiness | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !user?.id) return;
    let alive = true;
    loadOwnerBusinessList(user.id).then((result) => {
      if (!alive) return;
      setBusiness(result?.list[0] ?? null);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [enabled, user?.id]);

  return {
    business,
    loading,
    isFood: isFoodCategory(business?.category),
    brandId: business?.brandId ?? null,
  };
}
