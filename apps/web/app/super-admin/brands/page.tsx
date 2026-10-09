'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/system/data-table';
import { FilterChip, ChipRow } from '@/components/system/filter-chip';
import { SearchInput } from '@/components/system/toolbar';
import { PageHeader } from '@/components/system/page-header';
import { StatusPill } from '@/components/common/status-pill';
import { Button } from '@/components/ui/button';
import { Store, RefreshCw, Loader2, Activity, Clock } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { cn } from '@/lib/utils';
import { BrandStatusPill, eventMeta, parseList, seriesLabel, timeAgo, fullDate } from './_shared';

interface BrandRow {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED';
  billSeriesMode: 'SHARED' | 'PER_OUTLET';
  billSeriesPrefix?: string | null;
  createdAt: string;
  owner?: { id: string; name?: string; email?: string; phone?: string } | null;
  outletCount: number;
  pendingOutlets: number;
  lastEvent?: { type: string; summary: string; createdAt: string } | null;
}

interface FeedEvent {
  id: string;
  type: string;
  summary: string;
  createdAt: string;
  brand?: { id: string; name: string } | null;
}

const STATUS_CHIPS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Suspended', value: 'SUSPENDED' },
];

const LIMIT = 20;

export default function SuperAdminBrandsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<BrandRow[]>([]);
  const [meta, setMeta] = useState<any>({ total: 0, totalPages: 1, page: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { setPage(1); }, [debounced, status]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (debounced) params.set('q', debounced);
    if (status) params.set('status', status);
    const res = await apiService.get<any>(`/v1/admin/brands?${params}`);
    const parsed = parseList<BrandRow>(res);
    setRows(parsed.rows);
    setMeta(parsed.meta || { total: parsed.rows.length, totalPages: 1, page: 1 });
    setLoading(false);
  }, [page, debounced, status]);

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    const res = await apiService.get<any>('/v1/admin/brand-events?limit=10');
    setEvents(parseList<FeedEvent>(res).rows);
    setEventsLoading(false);
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const refresh = () => { fetchRows(); fetchEvents(); };

  const columns: Column<BrandRow>[] = [
    {
      key: 'name',
      header: 'Brand',
      cell: (b) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{b.name}</p>
          <p className="text-caption text-muted-foreground">Since {new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      cell: (b) => (
        <div className="min-w-0">
          <p className="truncate">{b.owner?.name || '—'}</p>
          <p className="truncate text-caption text-muted-foreground">{b.owner?.email || b.owner?.phone || ''}</p>
        </div>
      ),
      hideOnMobile: true,
    },
    {
      key: 'outlets',
      header: 'Outlets',
      value: (b) => b.outletCount,
      cell: (b) => (
        <span className="inline-flex items-center gap-2">
          <span className="font-semibold tabular-nums">{b.outletCount}</span>
          {b.pendingOutlets > 0 && <StatusPill tone="warning" label={`${b.pendingOutlets} pending`} />}
        </span>
      ),
    },
    { key: 'series', header: 'Bill series', cell: (b) => <span className="whitespace-nowrap text-caption">{seriesLabel(b.billSeriesMode, b.billSeriesPrefix)}</span>, hideOnMobile: true },
    { key: 'status', header: 'Status', cell: (b) => <BrandStatusPill status={b.status} /> },
    {
      key: 'last',
      header: 'Last activity',
      cell: (b) =>
        b.lastEvent ? (
          <div className="max-w-[16rem]">
            <p className="line-clamp-1 text-caption">{b.lastEvent.summary}</p>
            <p className="text-caption text-muted-foreground" title={fullDate(b.lastEvent.createdAt)}>
              {timeAgo(b.lastEvent.createdAt)}
            </p>
          </div>
        ) : (
          '—'
        ),
      hideOnMobile: true,
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <PageHeader
          className="mb-0"
          title="Brand accounts"
          description="Brands with multiple outlets, and everything happening across them."
          actions={
            <Button variant="outline" onClick={refresh} disabled={loading || eventsLoading}>
              <RefreshCw className={cn((loading || eventsLoading) && 'animate-spin')} /> Refresh
            </Button>
          }
        />

        {/* Latest activity */}
        <Card className="rounded-2xl border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-4 py-3">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Latest brand activity</h2>
          </div>
          {eventsLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : events.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No brand activity yet.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-border">
              {events.map((ev, i) => {
                const m = eventMeta(ev.type);
                const Icon = m.icon;
                return (
                  <li key={ev.id} className="ui-fade-up flex items-start gap-3 px-4 py-3" style={{ animationDelay: `${Math.min(i, 8) * 0.03}s` }}>
                    <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border', m.bg, m.color, m.border)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground line-clamp-2">{ev.summary}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        {ev.brand && (
                          <Link href={`/super-admin/brands/${ev.brand.id}`} className="font-semibold text-primary hover:underline">{ev.brand.name}</Link>
                        )}
                        <span className={m.color}>{m.label}</span>
                        <span title={fullDate(ev.createdAt)}>{timeAgo(ev.createdAt)}</span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ChipRow label="Status">
            {STATUS_CHIPS.map((c) => (
              <FilterChip key={c.value || 'all'} selected={status === c.value} onClick={() => setStatus(c.value)}>
                {c.label}
              </FilterChip>
            ))}
          </ChipRow>
          <SearchInput value={search} onChange={setSearch} placeholder="Search brand, owner or email" />
        </div>

        <DataTable
          caption="Brand accounts"
          columns={columns}
          rows={rows}
          rowKey={(b) => b.id}
          loading={loading}
          onRowClick={(b) => router.push(`/super-admin/brands/${b.id}`)}
          page={meta?.page || page}
          pageSize={LIMIT}
          total={Number(meta?.total ?? rows.length)}
          onPageChange={setPage}
          empty={{ icon: Store, title: 'No brand accounts found' }}
          mobileCard={(b) => (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{b.name}</p>
                  <p className="truncate text-caption text-muted-foreground">{b.owner?.name || '—'}</p>
                </div>
                <BrandStatusPill status={b.status} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusPill tone="neutral" label={`${b.outletCount} outlet${b.outletCount === 1 ? '' : 's'}`} />
                {b.pendingOutlets > 0 && <StatusPill tone="warning" label={`${b.pendingOutlets} pending`} />}
                {b.lastEvent && (
                  <span className="inline-flex items-center gap-1 text-caption text-muted-foreground">
                    <Clock className="size-3" aria-hidden /> {timeAgo(b.lastEvent.createdAt)}
                  </span>
                )}
              </div>
            </div>
          )}
        />
      </div>
    </SuperAdminLayout>
  );
}
