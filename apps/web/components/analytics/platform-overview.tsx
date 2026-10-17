'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  BadgeIndianRupee,
  ChevronRight,
  ClipboardCheck,
  CircleDollarSign,
  Clock,
  Download,
  Eye,
  RefreshCw,
  ShieldAlert,
  Store,
  TicketPercent,
  UserPlus,
  Users,
  CalendarClock,
} from 'lucide-react';
import { PageHeader } from '@/components/system/page-header';
import { SectionCard } from '@/components/system/section-card';
import { downloadCsv } from '@/components/system/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { apiService } from '@/lib/services/api-service';
import { analyticsV2, type PlatformReport } from '@/lib/services/analytics-v2';
import { cn } from '@/lib/utils';
import { KpiCard } from './kpi-card';
import { BarList } from './bar-list';
import { PurchaseMixPanel } from './purchase-mix-panel';
import { Funnel } from './funnel';
import { RangePicker, useReportRange } from './range-picker';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KERALA_CITIES } from '@/lib/constants';
import { formatINR, formatNumber, formatRange, type ValueFormat } from './format';

const TimeSeriesChart = dynamic(
  () => import('./time-series-chart').then((m) => m.TimeSeriesChart),
  {
    ssr: false,
    loading: () => <div className="ui-skeleton h-[280px] rounded-xl" />,
  },
);

type Pt = PlatformReport['series']['points'][number];
type Key = 'visitors' | 'newUsers' | 'newBusinesses' | 'revenue' | 'gmv' | 'offerClaims';

const KPIS: {
  key: Key;
  label: string;
  icon: typeof Users;
  format: ValueFormat;
  series?: keyof Pt;
  definition: string;
}[] = [
  {
    key: 'visitors',
    label: 'Unique visitors',
    icon: Eye,
    format: 'number',
    series: 'visitors',
    definition:
      'Distinct people who used the public site (any tracked event), bots excluded. Coarser than daily buckets sum daily uniques.',
  },
  {
    key: 'newUsers',
    label: 'New customers',
    icon: UserPlus,
    format: 'number',
    series: 'newUsers',
    definition: 'Customer accounts (role USER) created in the period.',
  },
  {
    key: 'newBusinesses',
    label: 'New businesses',
    icon: Store,
    format: 'number',
    series: 'newBusinesses',
    definition: 'Business registrations started in the period, any status.',
  },
  {
    key: 'revenue',
    label: 'Revenue (ex-GST)',
    icon: CircleDollarSign,
    format: 'inr',
    series: 'revenue',
    definition:
      'Subscription payments verified by an admin in the period, before 18% GST. Source: transaction ledger.',
  },
  {
    key: 'gmv',
    label: 'Verified GMV',
    icon: BadgeIndianRupee,
    format: 'inr',
    definition:
      'Sum of customer bills approved by businesses in the period (spend driven through the platform).',
  },
  {
    key: 'offerClaims',
    label: 'Offer claims',
    icon: TicketPercent,
    format: 'number',
    definition: 'Business offers claimed by customers in the period.',
  },
];

type AuditRow = {
  id: string;
  action?: string;
  resource?: string;
  createdAt?: string;
  user?: { name?: string; email?: string } | null;
};

const ALL = '__all';

/** City + category slice for the whole report, kept in the URL next to the date range. */
function useScope() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const city = sp.get('city') ?? '';
  const categoryId = sp.get('category') ?? '';
  const set = (key: 'city' | 'category', value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}${next.toString() ? `?${next}` : ''}`, { scroll: false });
  };
  const clear = () => {
    const next = new URLSearchParams(sp.toString());
    next.delete('city');
    next.delete('category');
    router.replace(`${pathname}${next.toString() ? `?${next}` : ''}`, { scroll: false });
  };
  return { city, categoryId, set, clear };
}

export function PlatformOverview({ area }: { area: 'admin' | 'super-admin' }) {
  const range = useReportRange();
  const scope = useScope();
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    apiService.get<any>('/v1/categories').then((res) => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setCategories(
        list.filter((c: any) => !c.parentId).map((c: any) => ({ id: c.id, name: c.name })),
      );
    });
  }, []);
  const [report, setReport] = useState<PlatformReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Key>('visitors');
  const [nonce, setNonce] = useState(0);
  const [audit, setAudit] = useState<AuditRow[]>([]);

  const paramsKey = JSON.stringify([range.params, scope.city, scope.categoryId]);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    analyticsV2
      .platform({
        ...range.params,
        city: scope.city || undefined,
        categoryId: scope.categoryId || undefined,
      })
      .then((res) => {
        if (!alive) return;
        if (res.error || !res.data?.kpis || !res.data?.series)
          setError(res.error || 'Could not load the report');
        else setReport(res.data);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, nonce]);

  useEffect(() => {
    apiService.get<any>('/v1/audit-logs?page=1').then((r) => {
      const d = r.data;
      const list = Array.isArray(d) ? d : (d?.data ?? d?.items ?? []);
      setAudit(Array.isArray(list) ? list.slice(0, 8) : []);
    });
  }, []);

  const sel = KPIS.find((k) => k.key === selected)!;
  const points = report?.series.points ?? [];
  const chartPoints = useMemo(
    () => points.map((p) => ({ date: p.date, value: sel.series ? Number(p[sel.series]) || 0 : 0 })),
    [points, sel.series],
  );

  const snap = report?.snapshot;
  const attention = [
    {
      label: 'Approvals waiting',
      value: snap?.pendingApprovals,
      href: '/admin/approvals',
      icon: ClipboardCheck,
      urgent: (snap?.pendingApprovals ?? 0) > 0,
    },
    {
      label: 'Payments to verify',
      value: snap?.pendingPayments,
      href: '/admin/payment-approvals',
      icon: CircleDollarSign,
      urgent: (snap?.pendingPayments ?? 0) > 0,
    },
    {
      label: 'Open reports',
      value: snap?.openReports,
      href: '/admin/reports',
      icon: ShieldAlert,
      urgent: (snap?.openReports ?? 0) > 0,
    },
    {
      label: 'Trials ending in 7 days',
      value: snap?.trialsEnding7d,
      href: area === 'super-admin' ? '/super-admin/businesses' : '/admin/subscriptions',
      icon: Clock,
      urgent: false,
    },
    {
      label: 'Renewals due in 30 days',
      value: snap?.renewalsDue30d,
      href: '/admin/subscriptions',
      icon: CalendarClock,
      urgent: false,
    },
    {
      label: 'Live businesses',
      value: snap?.activeBusinesses,
      href: area === 'super-admin' ? '/super-admin/businesses' : '/admin/approvals',
      icon: Store,
      urgent: false,
    },
  ];

  const exportCsv = () => {
    if (!report) return;
    downloadCsv(
      `platform-${report.range.from}-to-${report.range.to}`,
      [
        { key: 'date', header: 'Date (IST)' },
        { key: 'visitors', header: 'Unique visitors' },
        { key: 'newUsers', header: 'New customers' },
        { key: 'newBusinesses', header: 'New businesses' },
        { key: 'revenue', header: 'Revenue ex-GST (INR)' },
      ],
      report.series.points,
    );
  };

  const k = report?.kpis;

  return (
    <>
      <PageHeader
        eyebrow={area === 'super-admin' ? 'Super admin' : 'Admin'}
        title="Platform overview"
        description="Growth, money and trust across every business on Whtzup.city."
        meta={
          report && (
            <span className="text-caption text-muted-foreground">
              {formatRange(report.range.from, report.range.to)} · vs previous {report.range.days}{' '}
              days
            </span>
          )
        }
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Refresh"
              onClick={() => setNonce((x) => x + 1)}
              disabled={loading}
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={!report}>
              <Download /> Export
            </Button>
            <RangePicker range={range} />
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Select
          value={scope.city || ALL}
          onValueChange={(v) => scope.set('city', v === ALL ? '' : v)}
        >
          <SelectTrigger className="h-10 w-full rounded-full sm:w-48" aria-label="City">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All cities</SelectItem>
            {KERALA_CITIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={scope.categoryId || ALL}
          onValueChange={(v) => scope.set('category', v === ALL ? '' : v)}
        >
          <SelectTrigger className="h-10 w-full rounded-full sm:w-56" aria-label="Category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(scope.city || scope.categoryId) && (
          <>
            <Button variant="ghost" onClick={scope.clear}>
              Clear
            </Button>
            <p className="w-full text-caption text-muted-foreground sm:w-auto">
              New customers and search terms aren’t tied to a business, so they show the whole
              platform.
            </p>
          </>
        )}
      </div>

      {error && !report ? (
        <EmptyState
          icon={RefreshCw}
          title="The report didn't load"
          description={error}
          action={{ label: 'Try again', onClick: () => setNonce((x) => x + 1) }}
        />
      ) : (
        <div className="space-y-6">
          {/* Needs attention: live queue counts, independent of the date range */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {attention.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className={cn(
                  'group flex flex-col justify-between gap-3 rounded-card border p-4 transition-colors',
                  a.urgent
                    ? 'border-warning/40 bg-warning-soft'
                    : 'border-border/70 bg-card hover:border-border-strong',
                )}
              >
                <span
                  className={cn(
                    'flex items-center justify-between text-label',
                    a.urgent ? 'text-warning-soft-foreground' : 'text-muted-foreground',
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <a.icon className="size-4" aria-hidden /> {a.label}
                  </span>
                  <ChevronRight
                    className="size-4 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                </span>
                {a.value == null ? (
                  <span className="ui-skeleton h-7 w-12" />
                ) : (
                  <span className="text-2xl font-bold tabular-nums text-foreground">
                    {formatNumber(a.value)}
                  </span>
                )}
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {KPIS.map((m) => (
              <KpiCard
                key={m.key}
                label={m.label}
                icon={m.icon}
                format={m.format}
                definition={m.definition}
                metric={k?.[m.key]}
                spark={m.series ? points.map((p) => Number(p[m.series!]) || 0) : undefined}
                loading={loading && !report}
                selected={selected === m.key}
                onSelect={m.series ? () => setSelected(m.key) : undefined}
              />
            ))}
          </div>

          <SectionCard title={sel.label} description="IST · today shown dashed while in progress">
            {loading && !report ? (
              <div className="ui-skeleton h-[280px] rounded-xl" />
            ) : (
              <TimeSeriesChart
                points={chartPoints}
                label={sel.label}
                format={sel.format}
                granularity={report?.range.granularity}
              />
            )}
          </SectionCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Revenue"
              description="Verified subscription payments in this period"
            >
              {report ? (
                <div className="space-y-5">
                  <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                      ['New plans', formatINR(k!.revenueNew.value)],
                      ['Renewals', formatINR(k!.revenueRenewal.value)],
                      ['GST collected', formatINR(k!.gst.value)],
                      ['Payments', formatNumber(k!.paidCount.value)],
                    ].map(([l, v]) => (
                      <div key={l}>
                        <dt className="text-caption text-muted-foreground">{l}</dt>
                        <dd className="mt-0.5 font-semibold tabular-nums">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div>
                    <p className="mb-2 text-overline text-subtle-foreground">By plan</p>
                    <BarList
                      format="inr"
                      items={report.planMix.map((p) => ({
                        key: p.plan,
                        label: p.plan.replace(/_/g, ' '),
                        hint: `${p.count} paid`,
                        value: p.revenue,
                      }))}
                      emptyLabel="No verified payments in this period"
                    />
                  </div>
                </div>
              ) : (
                <div className="ui-skeleton h-48" />
              )}
            </SectionCard>
            <SectionCard
              title="Business onboarding"
              description="Registrations started in this period, by how far they got"
            >
              {report ? (
                <Funnel stages={report.onboardingFunnel} />
              ) : (
                <div className="ui-skeleton h-40" />
              )}
            </SectionCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Most visited businesses" description="Unique profile visitors">
              {report ? (
                <BarList
                  items={report.topBusinesses.map((b) => ({
                    key: b.id,
                    label: (
                      <Link href={`/business/${b.id}`} className="hover:underline">
                        {b.name}
                      </Link>
                    ),
                    hint: b.city,
                    value: b.visitors,
                  }))}
                />
              ) : (
                <div className="ui-skeleton h-48" />
              )}
            </SectionCard>
            <SectionCard title="Top categories" description="Unique profile visitors by category">
              {report ? (
                <BarList
                  items={report.topCategories.map((c) => ({
                    key: c.name,
                    label: c.name,
                    value: c.visitors,
                  }))}
                />
              ) : (
                <div className="ui-skeleton h-48" />
              )}
            </SectionCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="What people search for"
              description="Most frequent searches · red = searches that found nothing"
            >
              {report ? (
                <BarList
                  items={report.searches.map((s) => ({
                    key: s.query,
                    label: s.query,
                    hint: s.zeroResults ? (
                      <span className="text-danger-soft-foreground">
                        {s.zeroResults} with no results
                      </span>
                    ) : undefined,
                    value: s.total,
                  }))}
                  emptyLabel="No searches recorded in this period"
                />
              ) : (
                <div className="ui-skeleton h-48" />
              )}
            </SectionCard>
            <SectionCard title="Live businesses by city">
              {report ? (
                <BarList
                  items={report.cities.map((c) => ({
                    key: c.city,
                    label: c.city,
                    value: c.businesses,
                  }))}
                />
              ) : (
                <div className="ui-skeleton h-48" />
              )}
            </SectionCard>
          </div>

          <PurchaseMixPanel mix={report?.purchases} offerChannels={report?.offerChannels} showCities />

          <SectionCard
            title="Recent admin activity"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/audit">
                  View all <ChevronRight />
                </Link>
              </Button>
            }
            padded={false}
          >
            {audit.length === 0 ? (
              <p className="px-6 pb-6 text-caption text-muted-foreground">No recent activity.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {audit.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {(a.action || 'Action')
                          .replace(/_/g, ' ')
                          .toLowerCase()
                          .replace(/^\w/, (c) => c.toUpperCase())}
                      </p>
                      <p className="truncate text-caption text-muted-foreground">
                        {a.resource?.toLowerCase()}{' '}
                        {a.user?.name || a.user?.email ? `· ${a.user?.name || a.user?.email}` : ''}
                      </p>
                    </div>
                    {a.createdAt && (
                      <time
                        className="shrink-0 text-caption text-subtle-foreground"
                        dateTime={a.createdAt}
                      >
                        {new Date(a.createdAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Kolkata',
                        })}
                      </time>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {report && (
            <p className="text-caption text-subtle-foreground">
              All times IST. Revenue from the payment ledger (verified only, excluding GST). Bots
              excluded from visitor counts. Updated{' '}
              {new Date(report.generatedAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              .
            </p>
          )}
        </div>
      )}
    </>
  );
}
