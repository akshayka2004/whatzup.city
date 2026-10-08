'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ExternalLink, ShieldAlert, X } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { PageHeader } from '@/components/system/page-header';
import { DataTable, downloadCsv, type Column } from '@/components/system/data-table';
import { Toolbar, SearchInput } from '@/components/system/toolbar';
import { FilterChip, ChipRow } from '@/components/system/filter-chip';
import { Modal } from '@/components/system/modal';
import { StatusPill } from '@/components/common/status-pill';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { apiService } from '@/lib/services/api-service';

type Report = {
  id: string;
  type: string;
  status: string;
  targetType?: string | null;
  targetId?: string | null;
  description: string;
  resolution?: string | null;
  createdAt: string;
  reporter?: { id: string; name?: string; email?: string } | null;
};

const TYPE_LABELS: Record<string, string> = {
  fake_business: 'Fake business',
  fraudulent_offer: 'Fraudulent offer',
  fake_review: 'Fake review',
  inappropriate_content: 'Inappropriate content',
  wrong_info: 'Wrong information',
  other: 'Other',
};

const STATUSES = ['PENDING', 'RESOLVED', 'DISMISSED'] as const;

/** Subject / business prefix that the API folds into the description ("Business: X | Subject: Y"). */
function split(desc: string) {
  const [head, ...rest] = desc.split('\n\n');
  if (rest.length && /^(Business:|Subject:)/.test(head)) {
    const subject = head.match(/Subject: ([^|]+)/)?.[1]?.trim();
    const business = head.match(/Business: ([^|]+)/)?.[1]?.trim();
    return { subject, business, body: rest.join('\n\n') };
  }
  return { subject: undefined, business: undefined, body: desc };
}

function targetHref(r: Report) {
  if (!r.targetId) return null;
  const t = (r.targetType || '').toUpperCase();
  if (t === 'BUSINESS') return `/business/${r.targetId}`;
  return null;
}

export default function ReportsPage() {
  const [rows, setRows] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<(typeof STATUSES)[number] | 'ALL'>('PENDING');
  const [q, setQ] = useState('');
  const [active, setActive] = useState<Report | null>(null);
  const [resolution, setResolution] = useState('');
  const [saving, setSaving] = useState<'resolve' | 'dismiss' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiService.get<any>(`/v1/reports${status === 'ALL' ? '' : `?status=${status}`}`);
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setRows(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => [r.description, r.type, r.reporter?.name, r.reporter?.email].some((v) => v?.toLowerCase().includes(term)));
  }, [rows, q]);

  const act = async (kind: 'resolve' | 'dismiss') => {
    if (!active) return;
    if (kind === 'resolve' && resolution.trim().length < 5) {
      toast.error('Write a short resolution note — it is kept on record.');
      return;
    }
    setSaving(kind);
    const res =
      kind === 'resolve'
        ? await apiService.patch(`/v1/reports/${active.id}/resolve`, { resolution: resolution.trim() })
        : await apiService.patch(`/v1/reports/${active.id}/dismiss`, {});
    setSaving(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(kind === 'resolve' ? 'Report resolved' : 'Report dismissed');
    setActive(null);
    setResolution('');
    load();
  };

  const columns: Column<Report>[] = [
    { key: 'type', header: 'Type', sortable: true, cell: (r) => <span className="font-medium">{TYPE_LABELS[r.type] ?? r.type}</span> },
    {
      key: 'subject',
      header: 'About',
      value: (r) => split(r.description).business ?? split(r.description).subject ?? '',
      cell: (r) => {
        const s = split(r.description);
        return <span className="line-clamp-1 max-w-[28ch]">{s.business ?? s.subject ?? s.body}</span>;
      },
    },
    { key: 'reporter', header: 'Reported by', value: (r) => r.reporter?.name ?? '', cell: (r) => r.reporter?.name ?? '—', hideOnMobile: true },
    { key: 'status', header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
    {
      key: 'createdAt',
      header: 'Received',
      sortable: true,
      value: (r) => r.createdAt,
      cell: (r) => new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }),
    },
  ];

  const pendingCount = status === 'PENDING' ? rows.length : undefined;

  return (
    <AdminLayout>
      <PageHeader
        title="Reports"
        description="Problems flagged by customers and businesses: fake listings, misleading offers, abusive reviews."
        meta={pendingCount != null && <StatusPill tone={pendingCount ? 'warning' : 'success'} label={`${pendingCount} pending`} dot={false} />}
      />

      <Toolbar
        actions={
          <Button
            variant="outline"
            disabled={!shown.length}
            onClick={() =>
              downloadCsv(
                `reports-${status.toLowerCase()}`,
                [
                  { key: 'createdAt', header: 'Received' },
                  { key: 'type', header: 'Type' },
                  { key: 'status', header: 'Status' },
                  { key: 'description', header: 'Description' },
                  { key: 'resolution', header: 'Resolution' },
                ],
                shown,
              )
            }
          >
            Export CSV
          </Button>
        }
      >
        <SearchInput value={q} onChange={setQ} placeholder="Search reports" />
        <ChipRow label="Status">
          {(['PENDING', 'RESOLVED', 'DISMISSED', 'ALL'] as const).map((s) => (
            <FilterChip key={s} selected={status === s} onClick={() => setStatus(s)}>
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </FilterChip>
          ))}
        </ChipRow>
      </Toolbar>

      <DataTable
        caption="Reports"
        columns={columns}
        rows={shown}
        rowKey={(r) => r.id}
        loading={loading}
        onRowClick={(r) => {
          setActive(r);
          setResolution(r.resolution ?? '');
        }}
        defaultSort={{ key: 'createdAt', dir: 'desc' }}
        empty={{ icon: ShieldAlert, title: status === 'PENDING' ? 'No open reports' : 'No reports here', description: 'New reports from customers and businesses show up here.' }}
        mobileCard={(r) => (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{TYPE_LABELS[r.type] ?? r.type}</p>
              <p className="truncate text-caption text-muted-foreground">{split(r.description).business ?? split(r.description).body}</p>
            </div>
            <StatusPill status={r.status} />
          </div>
        )}
      />

      <Modal
        open={!!active}
        onOpenChange={(o) => !o && setActive(null)}
        title={active ? (TYPE_LABELS[active.type] ?? active.type) : 'Report'}
        description={active ? `Received ${new Date(active.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}` : undefined}
        size="lg"
        footer={
          active?.status === 'PENDING' ? (
            <>
              <Button variant="outline" loading={saving === 'dismiss'} onClick={() => act('dismiss')}>
                <X /> Dismiss
              </Button>
              <Button loading={saving === 'resolve'} onClick={() => act('resolve')}>
                <Check /> Mark resolved
              </Button>
            </>
          ) : undefined
        }
      >
        {active &&
          (() => {
            const s = split(active.description);
            const href = targetHref(active);
            return (
              <div className="space-y-4">
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-caption text-muted-foreground">Status</dt>
                    <dd className="mt-1">
                      <StatusPill status={active.status} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-muted-foreground">Reported by</dt>
                    <dd className="mt-0.5 font-medium">{active.reporter?.name ?? '—'}</dd>
                    {active.reporter?.email && <dd className="text-caption text-muted-foreground">{active.reporter.email}</dd>}
                  </div>
                  {(s.business || active.targetType) && (
                    <div className="col-span-2">
                      <dt className="text-caption text-muted-foreground">About</dt>
                      <dd className="mt-0.5 flex items-center gap-2 font-medium">
                        {s.business ?? `${active.targetType?.toLowerCase()} ${active.targetId?.slice(0, 8) ?? ''}`}
                        {href && (
                          <Link href={href} target="_blank" className="inline-flex items-center gap-1 text-label text-primary hover:underline">
                            Open <ExternalLink className="size-3.5" />
                          </Link>
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
                <div className="rounded-xl bg-surface-sunken p-4">
                  {s.subject && <p className="mb-1 font-medium">{s.subject}</p>}
                  <p className="whitespace-pre-line text-body">{s.body}</p>
                </div>
                {active.status === 'PENDING' ? (
                  <div className="space-y-1.5">
                    <label htmlFor="resolution" className="text-label">
                      Resolution note (required to resolve)
                    </label>
                    <Textarea
                      id="resolution"
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      placeholder="What did you check and what action was taken?"
                    />
                  </div>
                ) : (
                  active.resolution && (
                    <div>
                      <p className="text-caption text-muted-foreground">Resolution</p>
                      <p className="mt-0.5 text-body">{active.resolution}</p>
                    </div>
                  )
                )}
              </div>
            );
          })()}
      </Modal>
    </AdminLayout>
  );
}
