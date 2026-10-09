'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, Building2, Download, History, Receipt, RefreshCw, Settings, ShieldAlert, Tag, UserCheck } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { PageHeader } from '@/components/system/page-header';
import { DataTable, downloadCsv, type Column } from '@/components/system/data-table';
import { FilterChip, ChipRow } from '@/components/system/filter-chip';
import { SearchInput } from '@/components/system/toolbar';
import { Modal } from '@/components/system/modal';
import { StatusPill, humanizeStatus, type PillTone } from '@/components/common/status-pill';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { apiService } from '@/lib/services/api-service';

type EventCategory = 'BILL' | 'OFFER' | 'BUSINESS' | 'USER' | 'MODERATION' | 'SYSTEM' | 'NOTICE';

// Same keyword groups the API filters by (AUDIT_CATEGORY_TERMS in audit.service.ts).
function deriveCategory(action = ''): EventCategory {
  const a = action.toUpperCase();
  if (a.includes('BILL') || a.includes('INVOICE')) return 'BILL';
  if (a.includes('OFFER') || a.includes('COUPON') || a.includes('PROMO')) return 'OFFER';
  if (a.includes('BUSINESS') || a.includes('ONBOARDING') || a.includes('LISTING')) return 'BUSINESS';
  if (a.includes('REJECT') || a.includes('MODERAT') || a.includes('FLAG') || a.includes('BAN') || a.includes('FRAUD')) return 'MODERATION';
  if (a.includes('USER') || a.includes('LOGIN') || a.includes('LOGOUT') || a.includes('REGISTER') || a.includes('AUTH') || a.includes('PASSWORD')) return 'USER';
  if (a.includes('NOTICE') || a.includes('ANNOUNCEMENT') || a.includes('ALERT')) return 'NOTICE';
  return 'SYSTEM';
}

const CATEGORY: Record<EventCategory, { label: string; tone: PillTone; icon: React.ComponentType<{ className?: string }> }> = {
  BILL: { label: 'Bill', tone: 'info', icon: Receipt },
  OFFER: { label: 'Offer', tone: 'primary', icon: Tag },
  BUSINESS: { label: 'Business', tone: 'success', icon: Building2 },
  USER: { label: 'User', tone: 'info', icon: UserCheck },
  MODERATION: { label: 'Moderation', tone: 'danger', icon: ShieldAlert },
  SYSTEM: { label: 'System', tone: 'neutral', icon: Settings },
  NOTICE: { label: 'Notice', tone: 'warning', icon: Bell },
};

interface Entry {
  id: string;
  action: string;
  resource: string;
  category: EventCategory;
  user: string;
  createdAt: string;
  ip?: string | null;
  metadata?: unknown;
  oldData?: unknown;
  newData?: unknown;
}

const PAGE_SIZE = 50; // API page size
const fmt = (d: string) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

export default function AdminAuditPage() {
  const [rows, setRows] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState<EventCategory | ''>('');
  const [open, setOpen] = useState<Entry | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [debounced, category]);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page) });
    if (debounced) p.set('q', debounced);
    if (category) p.set('category', category);
    const res = await apiService.get<any>(`/v1/audit-logs?${p}`);
    if (res.error) toast.error(res.error);
    const list: any[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    setRows(
      list.map((l) => ({
        id: String(l.id),
        action: l.action || 'UNKNOWN',
        resource: l.resource || '',
        category: deriveCategory(l.action),
        user: l.user?.name || l.user?.email || (l.userId ? 'User' : 'System'),
        createdAt: l.createdAt,
        ip: l.ipAddress,
        metadata: l.metadata,
        oldData: l.oldData,
        newData: l.newData,
      })),
    );
    setTotal(Number(res.data?.meta?.total ?? list.length));
    setLoading(false);
  }, [page, debounced, category]);

  useEffect(() => {
    load();
  }, [load]);

  const columns: Column<Entry>[] = [
    { key: 'createdAt', header: 'When', value: (e) => e.createdAt, cell: (e) => <span className="whitespace-nowrap">{fmt(e.createdAt)}</span> },
    { key: 'user', header: 'Who', value: (e) => e.user, cell: (e) => e.user },
    { key: 'category', header: 'Type', value: (e) => CATEGORY[e.category].label, cell: (e) => <StatusPill tone={CATEGORY[e.category].tone} label={CATEGORY[e.category].label} /> },
    { key: 'action', header: 'Action', value: (e) => e.action, cell: (e) => <span className="font-medium">{humanizeStatus(e.action)}</span> },
    { key: 'resource', header: 'Resource', value: (e) => e.resource, cell: (e) => <span className="text-muted-foreground">{e.resource || '—'}</span>, hideOnMobile: true },
  ];

  const json = (v: unknown) => (v == null ? null : JSON.stringify(v, null, 2));

  return (
    <AdminLayout>
      <PageHeader
        title="Audit log"
        description="Who changed what, newest first. Select a row for the full record."
        actions={
          <>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={loading ? 'animate-spin' : undefined} /> Refresh
            </Button>
            <Button variant="outline" disabled={!rows.length} onClick={() => downloadCsv(`audit-page-${page}`, columns, rows)}>
              <Download /> CSV
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ChipRow label="Type">
          <FilterChip selected={!category} onClick={() => setCategory('')}>
            All
          </FilterChip>
          {(Object.keys(CATEGORY) as EventCategory[]).map((c) => (
            <FilterChip key={c} icon={CATEGORY[c].icon} selected={category === c} onClick={() => setCategory(c)}>
              {CATEGORY[c].label}
            </FilterChip>
          ))}
        </ChipRow>
        <SearchInput value={search} onChange={setSearch} placeholder="Search action, resource or person" />
      </div>

      <DataTable
        caption="Audit log"
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        loading={loading}
        onRowClick={setOpen}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        empty={{ icon: History, title: 'No matching events' }}
        mobileCard={(e) => (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{humanizeStatus(e.action)}</p>
              <p className="truncate text-caption text-muted-foreground">
                {e.user} · {fmt(e.createdAt)}
              </p>
            </div>
            <StatusPill tone={CATEGORY[e.category].tone} label={CATEGORY[e.category].label} />
          </div>
        )}
      />

      <Modal open={!!open} onOpenChange={(o) => !o && setOpen(null)} title={open ? humanizeStatus(open.action) : 'Event'} description={open ? `${open.user} · ${fmt(open.createdAt)}` : undefined} size="lg">
        {open && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="text-muted-foreground">Resource</dt>
              <dd className="break-all">{open.resource || '—'}</dd>
              {open.ip && (
                <>
                  <dt className="text-muted-foreground">IP</dt>
                  <dd className="font-mono">{open.ip}</dd>
                </>
              )}
            </dl>
            {(
              [
                ['Before', open.oldData],
                ['After', open.newData],
                ['Details', open.metadata],
              ] as const
            ).map(([l, v]) =>
              json(v) ? (
                <div key={l}>
                  <p className="mb-1 text-overline text-muted-foreground">{l}</p>
                  <pre className="max-h-60 overflow-auto rounded-control bg-surface-sunken p-3 font-mono text-caption">{json(v)}</pre>
                </div>
              ) : null,
            )}
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
