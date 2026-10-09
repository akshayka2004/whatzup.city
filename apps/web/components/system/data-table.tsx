'use client';

import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';

export type Column<T> = {
  key: string;
  header: ReactNode;
  /** Cell renderer; defaults to row[key]. */
  cell?: (row: T) => ReactNode;
  /** Value used for sorting and CSV. Defaults to row[key]. */
  value?: (row: T) => string | number | Date | null | undefined;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  className?: string;
  /** Hidden below md in table mode (still shown in the mobile card if mobileCard is not given). */
  hideOnMobile?: boolean;
};

type Sort = { key: string; dir: 'asc' | 'desc' } | null;

const read = <T,>(row: T, col: Column<T>) =>
  col.value
    ? col.value(row)
    : ((row as Record<string, unknown>)[col.key] as string | number | null | undefined);

function compare(a: unknown, b: unknown) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'en-IN', { numeric: true, sensitivity: 'base' });
}

/**
 * The app's table. Desktop: real <table> with sticky header and sortable columns.
 * Phones: each row becomes a card (`mobileCard`) so nothing scrolls sideways.
 * Server-paged lists pass `page/pageSize/total/onPageChange`; client lists can omit them.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  onRowClick,
  mobileCard,
  empty,
  page,
  pageSize,
  total,
  onPageChange,
  defaultSort = null,
  caption,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  mobileCard?: (row: T) => ReactNode;
  empty?: {
    icon?: ComponentType<{ className?: string }>;
    title: string;
    description?: string;
    action?: { label: string; href?: string; onClick?: () => void };
  };
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  defaultSort?: Sort;
  /** Accessible table name. */
  caption?: string;
  className?: string;
}) {
  const [sort, setSort] = useState<Sort>(defaultSort);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const out = [...rows].sort((a, b) => compare(read(a, col), read(b, col)));
    return sort.dir === 'desc' ? out.reverse() : out;
  }, [rows, sort, columns]);

  const toggleSort = (key: string) =>
    setSort((s) =>
      s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null,
    );

  const alignCls = (a?: Column<T>['align']) =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

  if (!loading && rows.length === 0) {
    return (
      <EmptyState
        icon={empty?.icon ?? Inbox}
        title={empty?.title ?? 'Nothing here yet'}
        description={empty?.description}
        action={empty?.action}
        compact
        className={className}
      />
    );
  }

  const paged =
    typeof page === 'number' &&
    typeof pageSize === 'number' &&
    typeof total === 'number' &&
    onPageChange;
  const pages = paged ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-card border border-border/70 bg-card shadow-e1',
        className,
      )}
    >
      {/* Phones: cards */}
      {mobileCard && (
        <ul className="divide-y divide-border/70 md:hidden" aria-label={caption}>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="space-y-2 p-4">
                  <div className="ui-skeleton h-4 w-2/3" />
                  <div className="ui-skeleton h-3 w-1/2" />
                </li>
              ))
            : sorted.map((row) => (
                <li key={rowKey(row)}>
                  {onRowClick ? (
                    // A div, not <button>: cards may hold their own switches/menus, and buttons can't nest.
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onRowClick(row)}
                      onKeyDown={(e) => {
                        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }}
                      className="block w-full cursor-pointer p-4 text-left outline-none focus-visible:bg-secondary active:bg-secondary"
                    >
                      {mobileCard(row)}
                    </div>
                  ) : (
                    <div className="p-4">{mobileCard(row)}</div>
                  )}
                </li>
              ))}
        </ul>
      )}

      {/* Tablet/desktop: table */}
      <div className={cn('max-h-[70dvh] overflow-auto', mobileCard && 'hidden md:block')}>
        <table className="w-full border-collapse text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="sticky top-0 z-[1] bg-surface-sunken/95 backdrop-blur supports-[backdrop-filter]:bg-surface-sunken/80">
            <tr>
              {columns.map((col) => {
                const active = sort?.key === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={
                      active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={cn(
                      'h-11 whitespace-nowrap border-b border-border/70 px-4 text-overline font-semibold text-muted-foreground',
                      alignCls(col.align),
                      col.hideOnMobile && 'hidden lg:table-cell',
                      col.className,
                    )}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-sm hover:text-foreground',
                          active && 'text-foreground',
                        )}
                      >
                        {col.header}
                        {active ? (
                          sort!.dir === 'asc' ? (
                            <ArrowUp className="size-3.5" />
                          ) : (
                            <ArrowDown className="size-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3.5 opacity-50" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn('px-4 py-3.5', col.hideOnMobile && 'hidden lg:table-cell')}
                      >
                        <div className="ui-skeleton h-4 w-[70%]" />
                      </td>
                    ))}
                  </tr>
                ))
              : sorted.map((row) => (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'border-b border-border/50 transition-colors last:border-0 hover:bg-secondary/60',
                      onRowClick && 'cursor-pointer',
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-3 align-middle text-foreground',
                          alignCls(col.align),
                          col.align === 'right' && 'tabular-nums',
                          col.hideOnMobile && 'hidden lg:table-cell',
                          col.className,
                        )}
                      >
                        {col.cell ? col.cell(row) : ((read(row, col) as ReactNode) ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {paged && pages > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-border/70 px-4 py-2.5 text-label text-muted-foreground">
          <span className="tabular-nums">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{' '}
            {total.toLocaleString('en-IN')}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft />
            </Button>
            <span className="px-2 tabular-nums">
              {page} / {pages}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= pages}
              aria-label="Next page"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Download rows as CSV using the same column definitions (headers must be strings to appear). */
export function downloadCsv<T>(filename: string, columns: Column<T>[], rows: T[]) {
  const esc = (v: unknown) => {
    let s = v instanceof Date ? v.toISOString() : v == null ? '' : String(v);
    // Text starting with = + - @ would run as a formula in Excel/Sheets.
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const cols = columns.filter((c) => typeof c.header === 'string');
  const lines = [
    cols.map((c) => esc(c.header)).join(','),
    ...rows.map((r) => cols.map((c) => esc(read(r, c))).join(',')),
  ];
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
