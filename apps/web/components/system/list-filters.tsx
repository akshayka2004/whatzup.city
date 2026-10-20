'use client';

import { FilterChip } from '@/components/system/filter-chip';
import { SearchInput } from '@/components/system/toolbar';
import { cn } from '@/lib/utils';

export type FilterOption = { value: string; label: string; count?: number };

export type FilterGroup = {
  key: string;
  label: string;
  /** '' means "All". */
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  /** Chips for short lists (the default up to 4 options), a dropdown otherwise. */
  display?: 'chips' | 'select';
};

const SELECT =
  'h-11 min-w-0 rounded-full border border-input bg-card px-4 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40';

/**
 * One filter row for any admin/dashboard list: search, single-select filter groups, sort, a live
 * result count and "Clear filters". Pages keep their own state and filter their rows client-side
 * (see `matchesSearch`); this only renders the controls.
 */
export function ListFilters({
  search,
  groups = [],
  sort,
  shown,
  total,
  noun = 'results',
  onReset,
  className,
}: {
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  groups?: FilterGroup[];
  sort?: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
  };
  shown: number;
  total: number;
  noun?: string;
  onReset: () => void;
  className?: string;
}) {
  const active = !!search?.value || groups.some((g) => g.value !== '');
  return (
    <div className={cn('mb-4 space-y-3', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {search && (
          <SearchInput
            value={search.value}
            onChange={search.onChange}
            placeholder={search.placeholder ?? 'Search…'}
          />
        )}
        {sort && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground sm:ml-auto">
            <span className="shrink-0">Sort</span>
            <select
              value={sort.value}
              onChange={(e) => sort.onChange(e.target.value)}
              className={SELECT}
              aria-label="Sort"
            >
              {sort.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {groups.map((g) => {
        const asSelect = g.display === 'select' || (!g.display && g.options.length > 4);
        return (
          <div key={g.key} className="flex flex-wrap items-center gap-2">
            <span className="w-full text-xs font-medium text-muted-foreground sm:w-auto">
              {g.label}
            </span>
            {asSelect ? (
              <select
                value={g.value}
                onChange={(e) => g.onChange(e.target.value)}
                className={SELECT}
                aria-label={g.label}
              >
                <option value="">All</option>
                {g.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                    {typeof o.count === 'number' ? ` (${o.count})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <FilterChip selected={g.value === ''} onClick={() => g.onChange('')}>
                  All
                </FilterChip>
                {g.options.map((o) => (
                  <FilterChip
                    key={o.value}
                    selected={g.value === o.value}
                    count={o.count}
                    onClick={() => g.onChange(g.value === o.value ? '' : o.value)}
                  >
                    {o.label}
                  </FilterChip>
                ))}
              </>
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-3 text-sm text-muted-foreground" aria-live="polite">
        <span>{shown === total ? `${total} ${noun}` : `${shown} of ${total} ${noun}`}</span>
        {active && (
          <button
            type="button"
            onClick={onReset}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

/** Case-insensitive "does any field contain every word of the query". */
export function matchesSearch(fields: (string | number | null | undefined)[], query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = fields
    .filter((f) => f != null)
    .map((f) => String(f).toLowerCase())
    .join(' ');
  return words.every((w) => hay.includes(w));
}

/** Count rows per key, for the numbers on filter chips. */
export function countBy<T>(rows: T[], key: (row: T) => string | null | undefined) {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = key(r);
    if (k) out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
