'use client';

import { useEffect, useState } from 'react';
import { apiService } from '@/lib/services/api-service';
import { isFoodCategory } from '@/lib/food-category';
import { useAuth } from '@/hooks/use-auth';

export interface OwnerBusiness {
  id: string;
  name: string;
  status?: string;
  city?: string;
  category?: { id: string; name: string; slug: string } | null;
}

// One shared request per signed-in user, reused by the sidebar, the prompt and the menu page.
let cached: Promise<OwnerBusiness | null> | null = null;
let cachedForUser: string | null = null;

function loadOwnerBusiness(userId: string): Promise<OwnerBusiness | null> {
  if (!cached || cachedForUser !== userId) {
    cachedForUser = userId;
    cached = apiService.get<any>('/v1/businesses/owner/mine').then((res) => {
      const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      if (res.error || !list.length) {
        cached = null; // let a later mount retry
        return null;
      }
      return list[0] as OwnerBusiness;
    });
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
    loadOwnerBusiness(user.id).then((b) => {
      if (!alive) return;
      setBusiness(b);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [enabled, user?.id]);

  return { business, loading, isFood: isFoodCategory(business?.category) };
}
