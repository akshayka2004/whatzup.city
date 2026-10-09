'use client';

/**
 * Admin subscriptions — live data only.
 *
 * Subscribers come straight from the Subscription table via
 * GET /v1/subscriptions/admin/all (cross-tenant, includes the latest payment).
 * Plan definitions come from lib/subscription-plans so this page can never
 * drift from what registration actually sells.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Hotel,
  IndianRupee,
  ReceiptText,
  XCircle,
} from 'lucide-react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { PageHeader } from '@/components/system/page-header';
import { DataTable, downloadCsv, type Column } from '@/components/system/data-table';
import { FilterChip, ChipRow } from '@/components/system/filter-chip';
import { SearchInput } from '@/components/system/toolbar';
import { StatusPill, statusTone, humanizeStatus } from '@/components/common/status-pill';
import { KpiCard } from '@/components/analytics/kpi-card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiService } from '@/lib/services/api-service';
import {
  SUBSCRIPTION_PLANS,
  PLAN_DURATION_DAYS,
  formatINR,
  planLabel,
} from '@/lib/subscription-plans';
import { cn } from '@/lib/utils';

type Row = {
  id: string;
  packageName: string;
  pricing: string | number;
  duration: number;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  business?: {
    id: string;
    name: string;
    slug: string;
    city: string;
    status: string;
    category?: { name: string; slug: string } | null;
  } | null;
  latestPayment?: {
    id: string;
    amount: string | number;
    status: string;
    method: string;
    transactionRef?: string | null;
    createdAt: string;
    verifiedAt?: string | null;
  } | null;
};

type Txn = {
  id: string;
  createdAt: string;
  type?: string;
  cycle?: string;
  packageName?: string;
  amountBase?: number | string;
  amountTax?: number | string;
  amountTotal?: number | string;
  reference?: string | null;
  business?: { name?: string } | null;
};

const fmtDate = (v?: string | null) =>
  v
    ? new Date(v).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      })
    : '—';
const day = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export default function AdminSubscriptionsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [res, txRes] = await Promise.all([
        apiService.get<any>('/v1/subscriptions/admin/all'),
        apiService.get<any>('/v1/payments/admin/transactions'),
      ]);
      setTxns(Array.isArray(txRes.data) ? txRes.data : (txRes.data?.data ?? []));
      if (res.error) setError(res.error);
      setRows(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const q = search.trim().toLowerCase();
        if (q && !(r.business?.name || '').toLowerCase().includes(q)) return false;
        if (planFilter !== 'all' && r.packageName !== planFilter) return false;
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        return true;
      }),
    [rows, search, planFilter, statusFilter],
  );

  const active = rows.filter((r) => r.status === 'ACTIVE');
  const revenue = active.reduce((sum, r) => sum + Number(r.pricing || 0), 0);
  const pendingCount = rows.filter((r) => r.status === 'PENDING_PAYMENT').length;
  const soon = active.filter((r) => {
    const d = (new Date(r.endDate).getTime() - Date.now()) / 86_400_000;
    return d >= 0 && d <= 30;
  }).length;

  const subColumns: Column<Row>[] = [
    {
      key: 'business',
      header: 'Business',
      value: (r) => r.business?.name ?? '',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.business?.name || '—'}</p>
          <p className="truncate text-caption text-muted-foreground">
            {[r.business?.city, r.business?.category?.name].filter(Boolean).join(' · ')}
          </p>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      value: (r) => planLabel(r.packageName),
      cell: (r) => (
        <span className="inline-flex items-center gap-1">
          {r.packageName?.startsWith('HOTEL_') && (
            <Hotel className="size-3.5 text-muted-foreground" aria-hidden />
          )}
          {planLabel(r.packageName)}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      value: (r) => Number(r.pricing || 0),
      cell: (r) => formatINR(Number(r.pricing || 0)),
    },
    {
      key: 'status',
      header: 'Status',
      value: (r) => r.status,
      cell: (r) => <StatusPill tone={statusTone(r.status)} label={humanizeStatus(r.status)} />,
    },
    {
      key: 'payment',
      header: 'Last payment',
      value: (r) => (r.latestPayment ? `${r.latestPayment.status} ${r.latestPayment.method}` : ''),
      cell: (r) =>
        r.latestPayment ? (
          <span className="inline-flex items-center gap-1.5">
            {r.latestPayment.status === 'SUCCESS' ? (
              <CheckCircle2 className="size-4 text-success" aria-label="Paid" />
            ) : r.latestPayment.status === 'FAILED' ? (
              <XCircle className="size-4 text-destructive" aria-label="Failed" />
            ) : (
              <Clock className="size-4 text-warning" aria-label="Pending" />
            )}
            <span className="text-caption">
              {formatINR(Number(r.latestPayment.amount))} · {r.latestPayment.method}
            </span>
          </span>
        ) : (
          <span className="text-caption text-muted-foreground">None</span>
        ),
      hideOnMobile: true,
    },
    {
      key: 'endDate',
      header: 'Expires',
      sortable: true,
      value: (r) => r.endDate,
      cell: (r) => fmtDate(r.endDate),
    },
  ];

  const txColumns: Column<Txn>[] = [
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      value: (t) => t.createdAt,
      cell: (t) => fmtDate(t.createdAt),
    },
    {
      key: 'business',
      header: 'Business',
      value: (t) => t.business?.name ?? '',
      cell: (t) => t.business?.name || '—',
    },
    {
      key: 'type',
      header: 'Event',
      value: (t) => `${t.type?.replace('PAYMENT_', '') ?? ''} ${t.cycle ?? ''}`.trim(),
      cell: (t) => (
        <span className="inline-flex items-center gap-1.5">
          <StatusPill
            tone="neutral"
            label={humanizeStatus(t.type?.replace('PAYMENT_', '') || '—')}
          />
          {t.cycle && (
            <span className="text-caption text-muted-foreground">{t.cycle.toLowerCase()}</span>
          )}
        </span>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      value: (t) => planLabel(t.packageName || ''),
      cell: (t) => planLabel(t.packageName || ''),
      hideOnMobile: true,
    },
    {
      key: 'base',
      header: 'Base',
      align: 'right',
      value: (t) => Number(t.amountBase || 0),
      cell: (t) => formatINR(Number(t.amountBase || 0)),
      hideOnMobile: true,
    },
    {
      key: 'gst',
      header: 'GST',
      align: 'right',
      value: (t) => Number(t.amountTax || 0),
      cell: (t) => formatINR(Number(t.amountTax || 0)),
      hideOnMobile: true,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      sortable: true,
      value: (t) => Number(t.amountTotal || 0),
      cell: (t) => <span className="font-semibold">{formatINR(Number(t.amountTotal || 0))}</span>,
    },
    {
      key: 'reference',
      header: 'Ref',
      value: (t) => t.reference ?? '',
      cell: (t) => <span className="text-caption text-muted-foreground">{t.reference || '—'}</span>,
      hideOnMobile: true,
    },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Subscriptions"
        description={`Live from the database. Plans run for ${PLAN_DURATION_DAYS} days.`}
      />
      {error && (
        <p
          className="mb-4 rounded-control bg-danger-soft p-3 text-sm text-danger-soft-foreground"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Active revenue"
          icon={IndianRupee}
          format="inr"
          loading={loading}
          metric={{ value: revenue, previous: 0, change: null }}
          definition="Sum of plan prices on active subscriptions"
        />
        <KpiCard
          label="Active"
          icon={CheckCircle2}
          loading={loading}
          metric={{ value: active.length, previous: 0, change: null }}
        />
        <KpiCard
          label="Awaiting payment"
          icon={Clock}
          loading={loading}
          metric={{ value: pendingCount, previous: 0, change: null }}
        />
        <KpiCard
          label="Renewing in 30 days"
          icon={CreditCard}
          loading={loading}
          metric={{ value: soon, previous: 0, change: null }}
          definition="Active plans that end within 30 days"
        />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SUBSCRIPTION_PLANS.map((p) => {
          const count = active.filter((r) => r.packageName === p.code).length;
          return (
            <button
              key={p.code}
              type="button"
              onClick={() => setPlanFilter(planFilter === p.code ? 'all' : p.code)}
              aria-pressed={planFilter === p.code}
              className={cn(
                'ui-press rounded-card border bg-card p-4 text-left shadow-e1 transition-colors',
                planFilter === p.code
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:bg-secondary',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-primary">{p.name}</span>
                {p.highlight && <StatusPill tone="success" label="Popular" />}
              </div>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span className="text-title font-semibold tabular-nums">
                  {formatINR(p.offerPrice)}
                </span>
                <span className="text-caption text-muted-foreground line-through">
                  {formatINR(p.mrp)}
                </span>
              </p>
              <p className="mt-1 text-caption text-muted-foreground">
                {p.offers} offers · {p.vouchers} vouchers
              </p>
              <p className="mt-2 text-sm font-medium">
                {count} active subscriber{count === 1 ? '' : 's'}
              </p>
            </button>
          );
        })}
      </div>

      <Tabs defaultValue="subscribers">
        <TabsList>
          <TabsTrigger value="subscribers">
            <CreditCard /> Subscribers
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <ReceiptText /> Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscribers" className="mt-4">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <ChipRow label="Status">
              {[
                ['all', 'All'],
                ['ACTIVE', 'Active'],
                ['PENDING_PAYMENT', 'Awaiting payment'],
                ['EXPIRED', 'Expired'],
              ].map(([v, l]) => (
                <FilterChip
                  key={v}
                  selected={statusFilter === v}
                  onClick={() => setStatusFilter(v)}
                >
                  {l}
                </FilterChip>
              ))}
            </ChipRow>
            <div className="flex items-center gap-2">
              <SearchInput value={search} onChange={setSearch} placeholder="Search business" />
              <Button
                variant="outline"
                disabled={!filtered.length}
                onClick={() => downloadCsv(`subscriptions-${day()}`, subColumns, filtered)}
              >
                <Download /> CSV
              </Button>
            </div>
          </div>
          <DataTable
            caption="Subscriptions"
            columns={subColumns}
            rows={filtered}
            rowKey={(r) => r.id}
            loading={loading}
            empty={{
              icon: CreditCard,
              title: 'No subscriptions found',
              description: 'They appear as soon as a business picks a plan.',
            }}
            mobileCard={(r) => (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.business?.name || '—'}</p>
                  <p className="truncate text-caption text-muted-foreground">
                    {planLabel(r.packageName)} · ends {fmtDate(r.endDate)}
                  </p>
                </div>
                <StatusPill tone={statusTone(r.status)} label={humanizeStatus(r.status)} />
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <div className="mb-4 flex justify-end">
            <Button
              variant="outline"
              disabled={!txns.length}
              onClick={() => downloadCsv(`transactions-${day()}`, txColumns, txns)}
            >
              <Download /> CSV
            </Button>
          </div>
          <DataTable
            caption="Transactions"
            columns={txColumns}
            rows={txns}
            rowKey={(t) => t.id}
            loading={loading}
            empty={{ icon: ReceiptText, title: 'No transactions yet' }}
            mobileCard={(t) => (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.business?.name || '—'}</p>
                  <p className="truncate text-caption text-muted-foreground">
                    {fmtDate(t.createdAt)} ·{' '}
                    {humanizeStatus(t.type?.replace('PAYMENT_', '') || '—')}
                  </p>
                </div>
                <span className="font-semibold tabular-nums">
                  {formatINR(Number(t.amountTotal || 0))}
                </span>
              </div>
            )}
          />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
