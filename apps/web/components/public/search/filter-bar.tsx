'use client';

import { useState } from 'react';
import { BadgeCheck, Clock, SlidersHorizontal, Star, Tag, X } from 'lucide-react';
import {
  Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { KERALA_CITIES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  SORT_LABELS, countActive, type Filters, type SortKey,
} from './filters';

/** Which controls a page offers. Anything omitted is simply not rendered. */
export interface FilterShow {
  open?: boolean;
  rating?: boolean;
  halal?: boolean;
  fulfilment?: boolean;
  city?: boolean;
  sorts: SortKey[];
}

const NO_SCROLLBAR = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

const chipClass = (active: boolean) =>
  cn(
    'ui-press inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors md:h-9 md:px-3.5',
    active
      ? 'border-primary/40 bg-primary/10 text-primary'
      : 'border-border bg-card text-foreground hover:bg-secondary',
  );

function keysFor(show: FilterShow): (keyof Filters)[] {
  const k: (keyof Filters)[] = ['sort'];
  if (show.open) k.push('open');
  if (show.rating) k.push('rating4');
  if (show.halal) k.push('halal');
  if (show.fulfilment) k.push('fulfilment');
  if (show.city) k.push('city');
  return k;
}

/**
 * Quick chips (always visible, swipeable on mobile) + sort / city selects on
 * desktop + a "Filters" bottom sheet on mobile that holds everything.
 */
export function FilterBar({
  filters,
  onChange,
  show,
  resultCount,
  defaultSort = 'relevant',
  className,
}: {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  show: FilterShow;
  /** Used for the "Show N results" button in the mobile sheet. */
  resultCount?: number;
  /** The sort that counts as "not filtering" (Nearby defaults to nearest). */
  defaultSort?: SortKey;
  className?: string;
}) {
  const [sheet, setSheet] = useState(false);
  const active = countActive(filters, keysFor(show), defaultSort);
  const showSort = show.sorts.length > 1;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          '-mx-4 flex min-w-0 flex-1 snap-x items-center gap-2 overflow-x-auto px-4 py-0.5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0',
          NO_SCROLLBAR,
        )}
      >
        {/* Mobile: everything lives in the sheet */}
        {(showSort || show.city) && (
          <button
            type="button"
            onClick={() => setSheet(true)}
            className={cn(chipClass(active > 0), 'md:hidden')}
            aria-haspopup="dialog"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {active > 0 && (
              <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
                {active}
              </span>
            )}
          </button>
        )}

        {show.open && (
          <button
            type="button"
            aria-pressed={filters.open}
            onClick={() => onChange({ open: !filters.open })}
            className={chipClass(filters.open)}
          >
            <Clock className="h-4 w-4" />
            Open now
          </button>
        )}
        {show.rating && (
          <button
            type="button"
            aria-pressed={filters.rating4}
            onClick={() => onChange({ rating4: !filters.rating4 })}
            className={chipClass(filters.rating4)}
          >
            <Star className={cn('h-4 w-4', filters.rating4 && 'fill-warning text-warning')} />
            Rating 4+
          </button>
        )}
        {show.halal && (
          <button
            type="button"
            aria-pressed={filters.halal}
            onClick={() => onChange({ halal: !filters.halal })}
            className={chipClass(filters.halal)}
          >
            <BadgeCheck className="h-4 w-4" />
            Halal
          </button>
        )}
        {show.fulfilment && (
          <>
            <button
              type="button"
              aria-pressed={filters.fulfilment === 'DINE_IN'}
              onClick={() => onChange({ fulfilment: filters.fulfilment === 'DINE_IN' ? '' : 'DINE_IN' })}
              className={chipClass(filters.fulfilment === 'DINE_IN')}
            >
              <Tag className="h-4 w-4" />
              Dine-in offers
            </button>
            <button
              type="button"
              aria-pressed={filters.fulfilment === 'TAKEAWAY'}
              onClick={() => onChange({ fulfilment: filters.fulfilment === 'TAKEAWAY' ? '' : 'TAKEAWAY' })}
              className={chipClass(filters.fulfilment === 'TAKEAWAY')}
            >
              <Tag className="h-4 w-4" />
              Takeaway offers
            </button>
          </>
        )}

        {/* Desktop: sort + city inline */}
        {showSort && (
          <Select value={filters.sort} onValueChange={(v) => onChange({ sort: v as SortKey })}>
            <SelectTrigger
              aria-label="Sort results"
              className="hidden h-9 w-44 shrink-0 rounded-full border-border bg-card md:flex"
            >
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {show.sorts.map((s) => (
                <SelectItem key={s} value={s}>{SORT_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {show.city && (
          <Select
            value={filters.city || 'all'}
            onValueChange={(v) => onChange({ city: v === 'all' ? '' : v })}
          >
            <SelectTrigger
              aria-label="Filter by city"
              className="hidden h-9 w-44 shrink-0 rounded-full border-border bg-card md:flex"
            >
              <SelectValue placeholder="All cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cities</SelectItem>
              {KERALA_CITIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <FilterSheet
        open={sheet}
        onOpenChange={setSheet}
        filters={filters}
        onChange={onChange}
        show={show}
        resultCount={resultCount}
        defaultSort={defaultSort}
      />
    </div>
  );
}

function ToggleRow({
  label, hint, checked, onCheckedChange,
}: { label: string; hint?: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-1.5">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

function FilterSheet({
  open,
  onOpenChange,
  filters,
  onChange,
  show,
  resultCount,
  defaultSort,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  show: FilterShow;
  resultCount?: number;
  defaultSort: SortKey;
}) {
  const active = countActive(filters, keysFor(show), defaultSort);
  const reset: Partial<Filters> = {
    open: false, rating4: false, halal: false, fulfilment: '', sort: defaultSort, city: '',
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Filters</DrawerTitle>
          <DrawerDescription>Narrow the list down. Changes apply instantly.</DrawerDescription>
        </DrawerHeader>

        <div className="max-h-[55vh] space-y-5 overflow-y-auto px-4 pb-2">
          {(show.open || show.rating || show.halal || show.fulfilment) && (
            <section aria-label="Show only" className="divide-y divide-border">
              {show.open && (
                <ToggleRow label="Open now" hint="Based on the hours the business has listed" checked={filters.open} onCheckedChange={(v) => onChange({ open: v })} />
              )}
              {show.rating && (
                <ToggleRow label="Rating 4+" checked={filters.rating4} onCheckedChange={(v) => onChange({ rating4: v })} />
              )}
              {show.halal && (
                <ToggleRow label="Halal" checked={filters.halal} onCheckedChange={(v) => onChange({ halal: v })} />
              )}
              {show.fulfilment && (
                <>
                  <ToggleRow
                    label="Dine-in offers"
                    hint="Has a live offer you can use at the venue"
                    checked={filters.fulfilment === 'DINE_IN'}
                    onCheckedChange={(v) => onChange({ fulfilment: v ? 'DINE_IN' : '' })}
                  />
                  <ToggleRow
                    label="Takeaway offers"
                    hint="Has a live offer you can use on takeaway"
                    checked={filters.fulfilment === 'TAKEAWAY'}
                    onCheckedChange={(v) => onChange({ fulfilment: v ? 'TAKEAWAY' : '' })}
                  />
                </>
              )}
            </section>
          )}

          {show.sorts.length > 1 && (
            <section aria-label="Sort by">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sort by</p>
              <div role="radiogroup" aria-label="Sort by" className="grid grid-cols-2 gap-2">
                {show.sorts.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={filters.sort === s}
                    onClick={() => onChange({ sort: s })}
                    className={cn(chipClass(filters.sort === s), 'w-full justify-center rounded-xl')}
                  >
                    {SORT_LABELS[s]}
                  </button>
                ))}
              </div>
            </section>
          )}

          {show.city && (
            <section aria-label="City">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">City</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={!filters.city}
                  onClick={() => onChange({ city: '' })}
                  className={chipClass(!filters.city)}
                >
                  All cities
                </button>
                {KERALA_CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={filters.city === c}
                    onClick={() => onChange({ city: filters.city === c ? '' : c })}
                    className={chipClass(filters.city === c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <DrawerFooter className="flex-row gap-2 border-t border-border">
          <button
            type="button"
            disabled={active === 0}
            onClick={() => onChange(reset)}
            className="ui-press inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="ui-press inline-flex h-11 flex-[2] items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {resultCount != null ? `Show ${resultCount} ${resultCount === 1 ? 'result' : 'results'}` : 'Show results'}
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/** Removable chips for every active filter, plus "Clear all". Renders nothing when none are active. */
export function ActiveFilters({
  filters,
  onChange,
  show,
  extra,
  defaultSort = 'relevant',
  className,
}: {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  show: FilterShow;
  defaultSort?: SortKey;
  /** Extra removable chips owned by the page (e.g. the radius). */
  extra?: { key: string; label: string; onRemove: () => void }[];
  className?: string;
}) {
  const items: { key: string; label: string; onRemove: () => void }[] = [];
  if (show.open && filters.open) items.push({ key: 'open', label: 'Open now', onRemove: () => onChange({ open: false }) });
  if (show.rating && filters.rating4) items.push({ key: 'rating', label: 'Rating 4+', onRemove: () => onChange({ rating4: false }) });
  if (show.halal && filters.halal) items.push({ key: 'halal', label: 'Halal', onRemove: () => onChange({ halal: false }) });
  if (show.fulfilment && filters.fulfilment) {
    items.push({
      key: 'ful',
      label: filters.fulfilment === 'DINE_IN' ? 'Dine-in offers' : 'Takeaway offers',
      onRemove: () => onChange({ fulfilment: '' }),
    });
  }
  if (show.city && filters.city) items.push({ key: 'city', label: filters.city, onRemove: () => onChange({ city: '' }) });
  if (filters.sub) items.push({ key: 'sub', label: filters.sub, onRemove: () => onChange({ sub: '' }) });
  if (show.sorts.length > 1 && filters.sort !== defaultSort) {
    items.push({ key: 'sort', label: `Sort: ${SORT_LABELS[filters.sort]}`, onRemove: () => onChange({ sort: defaultSort }) });
  }
  if (extra) items.push(...extra);
  if (items.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)} aria-label="Active filters">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={it.onRemove}
          aria-label={`Remove filter: ${it.label}`}
          className="ui-pop ui-press relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 pl-3 pr-2 text-xs font-semibold text-primary after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']"
        >
          {it.label}
          <X className="h-3.5 w-3.5" />
        </button>
      ))}
      {items.length > 1 && (
        <button
          type="button"
          onClick={() => {
            onChange({ open: false, rating4: false, halal: false, fulfilment: '', sort: defaultSort, city: '', sub: '' });
            extra?.forEach((e) => e.onRemove());
          }}
          className="relative inline-flex h-9 cursor-pointer items-center px-2 text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
