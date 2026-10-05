'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Store, Search, RefreshCw, Loader2, ChevronLeft, ChevronRight, Activity, Clock } from 'lucide-react';
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

function PendingBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning">
      {count} pending
    </span>
  );
}

export default function SuperAdminBrandsPage() {
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
  const totalPages = meta?.totalPages || 1;
  const curPage = meta?.page || page;

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="ui-glow relative flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Brand accounts</h1>
              <p className="text-muted-foreground text-sm mt-1">Brands with multiple outlets, and everything happening across them.</p>
            </div>
          </div>
          <Button onClick={refresh} variant="outline" size="sm" className="ui-press h-10 rounded-xl border-border text-muted-foreground hover:text-foreground gap-2">
            <RefreshCw className={cn('h-3.5 w-3.5', (loading || eventsLoading) && 'animate-spin')} /> Refresh
          </Button>
        </div>

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
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brand, owner, email…"
              className="pl-9 h-10 rounded-xl border-border bg-card text-sm text-foreground"
            />
          </div>
          <div className="ui-scroll-x flex gap-1.5">
            {STATUS_CHIPS.map((c) => (
              <button
                key={c.value}
                onClick={() => setStatus(c.value)}
                className={cn(
                  'ui-press h-10 shrink-0 rounded-xl px-4 text-xs font-medium transition-colors cursor-pointer',
                  status === c.value
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-secondary text-muted-foreground hover:text-foreground',
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <Card className="rounded-2xl border-border bg-card">
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
          </Card>
        ) : rows.length === 0 ? (
          <Card className="rounded-2xl border-border bg-card">
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground"><Store className="h-8 w-8 opacity-30" /><p className="text-sm">No brand accounts found</p></div>
          </Card>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="grid gap-3 md:hidden">
              {rows.map((b, i) => (
                <Link key={b.id} href={`/super-admin/brands/${b.id}`} className="ui-fade-up ui-press block" style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}>
                  <Card className="rounded-2xl border-border bg-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{b.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{b.owner?.name || '—'}{b.owner?.email ? ` · ${b.owner.email}` : ''}</p>
                      </div>
                      <BrandStatusPill status={b.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-semibold text-foreground">
                        <Store className="h-3 w-3 text-primary" />{b.outletCount} outlet{b.outletCount === 1 ? '' : 's'}
                      </span>
                      <PendingBadge count={b.pendingOutlets} />
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{seriesLabel(b.billSeriesMode, b.billSeriesPrefix)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5 text-[11px] text-muted-foreground">
                      <span className="line-clamp-1 min-w-0">{b.lastEvent ? b.lastEvent.summary : 'No activity yet'}</span>
                      {b.lastEvent && <span className="shrink-0 inline-flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(b.lastEvent.createdAt)}</span>}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Desktop table */}
            <Card className="hidden md:block rounded-2xl border-border bg-card overflow-hidden">
              <div className="ui-scroll-x">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Brand</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Owner</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Outlets</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Bill series</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Last activity</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((b, i) => (
                      <tr key={b.id} className="ui-fade-up border-b border-border last:border-0 hover:bg-secondary/20 transition-colors" style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}>
                        <td className="px-5 py-3">
                          <Link href={`/super-admin/brands/${b.id}`} className="font-semibold text-foreground hover:text-primary transition-colors">{b.name}</Link>
                          <p className="text-[11px] text-muted-foreground">Since {new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-xs font-medium text-foreground">{b.owner?.name || '—'}</p>
                          <p className="text-[11px] text-muted-foreground">{b.owner?.email || b.owner?.phone || ''}</p>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{b.outletCount}</span>
                            <PendingBadge count={b.pendingOutlets} />
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">{seriesLabel(b.billSeriesMode, b.billSeriesPrefix)}</td>
                        <td className="px-5 py-3"><BrandStatusPill status={b.status} /></td>
                        <td className="px-5 py-3 max-w-[260px]">
                          {b.lastEvent ? (
                            <>
                              <p className="text-xs text-foreground line-clamp-1">{b.lastEvent.summary}</p>
                              <p className="text-[11px] text-muted-foreground" title={fullDate(b.lastEvent.createdAt)}>{timeAgo(b.lastEvent.createdAt)}</p>
                            </>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link href={`/super-admin/brands/${b.id}`}>
                            <Button variant="outline" size="sm" className="ui-press h-9 rounded-xl border-border text-foreground hover:bg-secondary gap-1 cursor-pointer">
                              View <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Page {curPage} of {totalPages} · {meta?.total ?? rows.length} total</p>
            <div className="flex gap-2">
              <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={curPage <= 1} variant="outline" size="sm" aria-label="Previous page" className="h-10 w-10 rounded-xl border-border text-muted-foreground"><ChevronLeft className="h-4 w-4" /></Button>
              <Button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={curPage >= totalPages} variant="outline" size="sm" aria-label="Next page" className="h-10 w-10 rounded-xl border-border text-muted-foreground"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
