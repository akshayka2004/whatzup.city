'use client';

import { useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { FilterChip, ChipRow } from '@/components/system/filter-chip';
import { Input } from '@/components/ui/input';
import { apiService } from '@/lib/services/api-service';
import { KERALA_CITIES } from '@/lib/constants';
import { cn } from '@/lib/utils';

export type Audience = {
  categoryIds?: string[];
  minSpend?: number;
  windowDays?: number;
  cities?: string[];
  customerType?: 'ANY' | 'NEW' | 'RETURNING' | 'LAPSED';
  lapsedDays?: number;
};

type Cat = { id: string; name: string };

const TYPES: { value: NonNullable<Audience['customerType']>; label: string; hint: string }[] = [
  { value: 'ANY', label: 'Anyone', hint: 'Everyone who visits' },
  { value: 'NEW', label: 'New to you', hint: 'Never bought from you' },
  { value: 'RETURNING', label: 'Regulars', hint: 'Bought from you recently' },
  { value: 'LAPSED', label: 'Gone quiet', hint: 'Used to buy, then stopped' },
];

/** The ready-made starting points; a business can then adjust them. */
export const AUDIENCE_PRESETS: { label: string; build: (cats: Cat[]) => Audience }[] = [
  { label: 'Everyone', build: () => ({}) },
  { label: 'New customers', build: () => ({ customerType: 'NEW' }) },
  { label: 'Win back lapsed', build: () => ({ customerType: 'LAPSED', lapsedDays: 60 }) },
  {
    label: 'Cafe and bakery lovers',
    build: (cats) => {
      const ids = cats
        .filter((c) => /cafe|café|bakery|coffee|restaurant|food/i.test(c.name))
        .map((c) => c.id);
      return ids.length ? { categoryIds: ids.slice(0, 5), minSpend: 2000, windowDays: 60 } : {};
    },
  },
];

type Preview = { count: number | null; label: string; everyone?: boolean };

/**
 * Who the reward is for. The business describes the customer it wants; the platform shows the reward
 * only to people who fit. All it gets back is a rounded count, never names.
 */
export function AudienceBuilder({
  businessId,
  value,
  onChange,
  disabled,
}: {
  businessId: string;
  value: Audience;
  onChange: (a: Audience) => void;
  disabled?: boolean;
}) {
  const [cats, setCats] = useState<Cat[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    apiService.get<any>('/v1/categories').then((res) => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setCats(
        list.filter((c: any) => c?.id && c?.name).map((c: any) => ({ id: c.id, name: c.name })),
      );
    });
  }, []);

  const key = useMemo(() => JSON.stringify(value), [value]);
  useEffect(() => {
    if (!businessId) return;
    setChecking(true);
    const t = window.setTimeout(async () => {
      const res = await apiService.post<Preview>('/v1/vouchers/audience/preview', {
        businessId,
        audience: JSON.parse(key),
      });
      setChecking(false);
      if (!res.error && res.data) setPreview(res.data);
    }, 500);
    return () => window.clearTimeout(t);
  }, [businessId, key]);

  const set = (patch: Partial<Audience>) => onChange({ ...value, ...patch });
  const picked = new Set(value.categoryIds ?? []);
  const toggleCat = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else if (next.size < 15) next.add(id);
    const ids = [...next];
    if (!ids.length) {
      const { categoryIds, minSpend, windowDays, ...rest } = value;
      void categoryIds;
      void minSpend;
      void windowDays;
      onChange(rest);
    } else
      set({
        categoryIds: ids,
        minSpend: value.minSpend ?? 1000,
        windowDays: value.windowDays ?? 60,
      });
  };
  const cities = new Set(value.cities ?? []);
  const toggleCity = (c: string) => {
    const next = new Set(cities);
    if (next.has(c)) next.delete(c);
    else if (next.size < 20) next.add(c);
    set({ cities: [...next] });
  };

  return (
    <fieldset className="space-y-4 rounded-card border border-border p-4" disabled={disabled}>
      <legend className="px-1 text-sm font-semibold">Who is this reward for?</legend>

      <div className="flex flex-wrap gap-2">
        {AUDIENCE_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.build(cats))}
            className="min-h-9 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium">Kind of customer</span>
        <ChipRow label="Kind of customer" wrap>
          {TYPES.map((t) => (
            <FilterChip
              key={t.value}
              selected={(value.customerType ?? 'ANY') === t.value}
              onClick={() => set({ customerType: t.value })}
            >
              {t.label}
            </FilterChip>
          ))}
        </ChipRow>
        <p className="text-xs text-muted-foreground">
          {TYPES.find((t) => t.value === (value.customerType ?? 'ANY'))?.hint}
        </p>
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium">
          People who spend in these categories{' '}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
          {cats.map((c) => (
            <FilterChip key={c.id} selected={picked.has(c.id)} onClick={() => toggleCat(c.id)}>
              {c.name}
            </FilterChip>
          ))}
        </div>
        {picked.size > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Spent at least (₹)</span>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={value.minSpend ?? ''}
                onChange={(e) => set({ minSpend: Number(e.target.value) || 0 })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">In the last (days)</span>
              <Input
                type="number"
                inputMode="numeric"
                min={7}
                max={365}
                value={value.windowDays ?? 60}
                onChange={(e) => set({ windowDays: Number(e.target.value) || 60 })}
              />
            </label>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium">
          Cities <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
          {[...KERALA_CITIES].sort().map((c) => (
            <FilterChip key={c} selected={cities.has(c)} onClick={() => toggleCity(c)}>
              {c}
            </FilterChip>
          ))}
        </div>
      </div>

      <div
        className={cn(
          'flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm',
          checking && 'opacity-60',
        )}
        role="status"
        aria-live="polite"
      >
        <Users className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span>
          {preview ? preview.label : 'Checking how many people fit…'}
          {preview && !preview.everyone && (
            <span className="text-muted-foreground">
              {' '}
              among customers with a verified bill in the last 6 months
            </span>
          )}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        You see a rounded count only. Customers are never listed, and a reward shows up only for
        people who fit.
      </p>
    </fieldset>
  );
}
