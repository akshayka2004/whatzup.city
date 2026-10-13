'use client';

import { useEffect, useState } from 'react';
import { apiService } from '@/lib/services/api-service';
import type { ApiCategoryNode } from '@/lib/registration-categories';

// One request per page session; every component asking for categories shares it.
let cached: ApiCategoryNode[] | null = null;
let inflight: Promise<ApiCategoryNode[]> | null = null;

function unwrap(body: unknown): ApiCategoryNode[] {
  const b = body as any;
  for (const c of [b, b?.data, b?.data?.data, b?.items]) if (Array.isArray(c)) return c;
  return [];
}

function load(): Promise<ApiCategoryNode[]> {
  if (cached) return Promise.resolve(cached);
  inflight ??= apiService
    .get<unknown>('/v1/categories')
    .then((res) => {
      const list = res.error ? [] : unwrap(res.data);
      if (list.length) cached = list;
      return list;
    })
    .catch(() => [] as ApiCategoryNode[])
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** The active master category tree (roots with `children`). Empty until loaded or when the API is unreachable. */
export function useMasterCategories() {
  const [tree, setTree] = useState<ApiCategoryNode[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let live = true;
    load().then((list) => {
      if (!live) return;
      setTree(list);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, []);

  const find = (slug?: string | null): ApiCategoryNode | undefined => {
    if (!slug) return undefined;
    for (const root of tree) {
      if (root.slug === slug) return root;
      const child = root.children?.find((c) => c.slug === slug);
      if (child) return { ...child, template: child.template ?? root.template };
    }
    return undefined;
  };

  return { tree, loading, find };
}
