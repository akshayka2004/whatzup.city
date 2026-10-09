'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarRange, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { RangeParams } from '@/lib/services/analytics-v2';
import { formatRange, todayIst } from './format';

type Preset = { id: string; label: string; params: () => RangeParams };

const addDays = (key: string, d: number) =>
  new Date(Date.parse(`${key}T00:00:00Z`) + d * 86400000).toISOString().slice(0, 10);

export const PRESETS: Preset[] = [
  { id: 'today', label: 'Today', params: () => ({ from: todayIst(), to: todayIst() }) },
  { id: '7d', label: 'Last 7 days', params: () => ({ days: 7 }) },
  { id: '30d', label: 'Last 30 days', params: () => ({ days: 30 }) },
  { id: '90d', label: 'Last 90 days', params: () => ({ days: 90 }) },
  {
    id: 'mtd',
    label: 'Month to date',
    params: () => ({ from: `${todayIst().slice(0, 7)}-01`, to: todayIst() }),
  },
  {
    id: 'lm',
    label: 'Last month',
    params: () => {
      const firstThis = `${todayIst().slice(0, 7)}-01`;
      const lastPrev = addDays(firstThis, -1);
      return { from: `${lastPrev.slice(0, 7)}-01`, to: lastPrev };
    },
  },
  {
    id: 'ytd',
    label: 'Year to date',
    params: () => ({ from: `${todayIst().slice(0, 4)}-01-01`, to: todayIst() }),
  },
  { id: '12m', label: 'Last 12 months', params: () => ({ days: 365, granularity: 'month' }) },
];

const DEFAULT = '30d';

/** Report range stored in the URL (?range=30d or ?from=…&to=…), so links and reloads keep it. */
export function useReportRange() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const from = sp.get('from') ?? undefined;
  const to = sp.get('to') ?? undefined;
  const presetId = from && to ? 'custom' : (sp.get('range') ?? DEFAULT);

  const params = useMemo<RangeParams>(() => {
    if (presetId === 'custom') return { from, to };
    return (
      PRESETS.find((p) => p.id === presetId) ?? PRESETS.find((p) => p.id === DEFAULT)!
    ).params();
  }, [presetId, from, to]);

  const label =
    presetId === 'custom' && from && to
      ? formatRange(from, to)
      : (PRESETS.find((p) => p.id === presetId)?.label ?? 'Last 30 days');

  const setPreset = useCallback(
    (id: string) => {
      const next = new URLSearchParams(sp.toString());
      next.delete('from');
      next.delete('to');
      if (id === DEFAULT) next.delete('range');
      else next.set('range', id);
      router.replace(`${pathname}${next.toString() ? `?${next}` : ''}`, { scroll: false });
    },
    [sp, router, pathname],
  );

  const setCustom = useCallback(
    (f: string, t: string) => {
      const next = new URLSearchParams(sp.toString());
      next.delete('range');
      next.set('from', f);
      next.set('to', t);
      router.replace(`${pathname}?${next}`, { scroll: false });
    },
    [sp, router, pathname],
  );

  return { params, presetId, label, setPreset, setCustom };
}

export function RangePicker({
  range,
  className,
}: {
  range: ReturnType<typeof useReportRange>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(range.params.from ?? addDays(todayIst(), -29));
  const [t, setT] = useState(range.params.to ?? todayIst());
  const valid = !!f && !!t && f <= t;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('justify-between gap-2', className)}
          aria-label={`Date range: ${range.label}`}
        >
          <CalendarRange className="text-muted-foreground" />
          <span className="truncate">{range.label}</span>
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1.5">
        <ul role="listbox" aria-label="Date range presets">
          {PRESETS.map((p) => {
            const active = range.presetId === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    range.setPreset(p.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex h-9 w-full items-center justify-between rounded-md px-2.5 text-sm hover:bg-secondary',
                    active && 'font-semibold',
                  )}
                >
                  {p.label}
                  {active && <Check className="size-4 text-primary" />}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-1.5 space-y-2 border-t border-border px-1.5 pb-1 pt-2.5">
          <p className="text-overline text-subtle-foreground">Custom range</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-caption text-muted-foreground">From</span>
              <input
                type="date"
                value={f}
                max={t || todayIst()}
                onChange={(e) => setF(e.target.value)}
                className="h-9 w-full rounded-sm border border-input bg-card px-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-caption text-muted-foreground">To</span>
              <input
                type="date"
                value={t}
                min={f}
                max={todayIst()}
                onChange={(e) => setT(e.target.value)}
                className="h-9 w-full rounded-sm border border-input bg-card px-2 text-sm"
              />
            </label>
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={!valid}
            onClick={() => {
              range.setCustom(f, t);
              setOpen(false);
            }}
          >
            Apply
          </Button>
          <p className="text-caption text-subtle-foreground">All dates in IST.</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
