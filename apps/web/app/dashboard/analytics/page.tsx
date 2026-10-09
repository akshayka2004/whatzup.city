'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  BadgeIndianRupee,
  Bookmark,
  Download,
  Eye,
  Gift,
  MousePointerClick,
  Percent,
  QrCode,
  RefreshCw,
  Share2,
  Sparkles,
  Star,
  TicketPercent,
  UserPlus,
  Users,
} from 'lucide-react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { PageHeader } from '@/components/system/page-header';
import { SectionCard } from '@/components/system/section-card';
import { DataTable, downloadCsv, type Column } from '@/components/system/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { StatusPill } from '@/components/common/status-pill';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/analytics/kpi-card';
import { BarList } from '@/components/analytics/bar-list';
import { Funnel } from '@/components/analytics/funnel';
import { Heatmap } from '@/components/analytics/heatmap';
import { RangePicker, useReportRange } from '@/components/analytics/range-picker';
import {
  formatDateKey,
  formatNumber,
  formatPct,
  formatRange,
  type ValueFormat,
} from '@/components/analytics/format';
import { analyticsV2, type BusinessReport } from '@/lib/services/analytics-v2';
import { useActiveBusiness } from '@/hooks/use-active-business';

const TimeSeriesChart = dynamic(
  () => import('@/components/analytics/time-series-chart').then((m) => m.TimeSeriesChart),
  {
    ssr: false,
    loading: () => <div className="ui-skeleton h-[280px] rounded-xl" />,
  },
);

type Pt = BusinessReport['series']['points'][number];
type MainKey = 'visitors' | 'views' | 'actions' | 'actionRate' | 'offerClaims' | 'verifiedSpend';

const MAIN: {
  key: MainKey;
  label: string;
  icon: typeof Users;
  format: ValueFormat;
  series?: keyof Pt;
  definition: string;
}[] = [
  {
    key: 'visitors',
    label: 'Unique visitors',
    icon: Users,
    format: 'number',
    series: 'visitors',
    definition:
      'Distinct people who opened your profile (one browser = one visitor). Bots and link-preview crawlers are excluded.',
  },
  {
    key: 'views',
    label: 'Profile views',
    icon: Eye,
    format: 'number',
    series: 'views',
    definition:
      'Every time your profile page was opened, including repeat visits by the same person.',
  },
  {
    key: 'actions',
    label: 'Customer actions',
    icon: MousePointerClick,
    format: 'number',
    series: 'actions',
    definition: 'Taps on Call, Directions, WhatsApp and Website from your profile.',
  },
  {
    key: 'actionRate',
    label: 'Action rate',
    icon: Percent,
    format: 'pct',
    definition: 'Share of unique visitors who took at least one customer action.',
  },
  {
    key: 'offerClaims',
    label: 'Offer claims',
    icon: TicketPercent,
    format: 'number',
    series: 'claims',
    definition: 'Offers claimed by customers in this period (each claim counted once).',
  },
  {
    key: 'verifiedSpend',
    label: 'Verified spend',
    icon: BadgeIndianRupee,
    format: 'inr',
    series: 'spend',
    definition: 'Total of customer bills you approved in this period, by approval date.',
  },
];

const SOURCE_LABEL: Record<string, string> = {
  home: 'Home page',
  search: 'Search',
  category: 'Browse',
  nearby: 'Nearby',
  offers: 'Offers page',
  events: 'Events',
  favorites: 'Saved list',
  related: 'Other business pages',
  qr: 'QR code scan',
  external: 'Other websites & apps',
  direct: 'Direct / shared link',
  other: 'Other',
  unknown: 'Not recorded (older visits)',
};

const DEVICE_LABEL: Record<string, string> = {
  mobile: 'Mobile',
  desktop: 'Desktop',
  tablet: 'Tablet',
  unknown: 'Not recorded (older visits)',
};

type OfferRow = BusinessReport['offers'][number];
const OFFER_COLUMNS: Column<OfferRow>[] = [
  {
    key: 'title',
    header: 'Offer',
    sortable: true,
    cell: (o) => <span className="font-medium">{o.title}</span>,
  },
  { key: 'status', header: 'Status', cell: (o) => <StatusPill status={o.status} /> },
  {
    key: 'viewers',
    header: 'Opened by',
    align: 'right',
    sortable: true,
    cell: (o) => formatNumber(o.viewers),
  },
  {
    key: 'claims',
    header: 'Claims',
    align: 'right',
    sortable: true,
    cell: (o) => formatNumber(o.claims),
  },
  {
    key: 'conversion',
    header: 'Conversion',
    align: 'right',
    sortable: true,
    value: (o) => o.conversion ?? -1,
    cell: (o) => (o.conversion == null ? '—' : formatPct(o.conversion)),
  },
  {
    key: 'endDate',
    header: 'Ends',
    sortable: true,
    hideOnMobile: true,
    value: (o) => o.endDate,
    cell: (o) =>
      new Date(o.endDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
  },
];

function AnalyticsInner() {
  const range = useReportRange();
  const { activeBusinessId, activeBusiness, loading: bizLoading } = useActiveBusiness();
  const [report, setReport] = useState<BusinessReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MainKey>('visitors');
  const [nonce, setNonce] = useState(0);

  const paramsKey = JSON.stringify(range.params);
  useEffect(() => {
    if (!activeBusinessId) return;
    let alive = true;
    setLoading(true);
    setError(null);
    analyticsV2.business(activeBusinessId, range.params).then((res) => {
      if (!alive) return;
      if (res.error || !res.data?.kpis || !res.data?.series)
        setError(res.error || 'Could not load analytics');
      else setReport(res.data);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusinessId, paramsKey, nonce]);

  const sel = MAIN.find((m) => m.key === selected)!;
  const points = report?.series.points ?? [];
  const spark = (k?: keyof Pt) => (k ? points.map((p) => Number(p[k]) || 0) : undefined);

  const chartPoints = useMemo(() => {
    if (!report) return [];
    if (selected === 'actionRate') {
      return report.series.points.map((p) => ({
        date: p.date,
        value: p.visitors ? Math.round((p.actions / p.visitors) * 1000) / 10 : 0,
      }));
    }
    return report.series.points.map((p) => ({
      date: p.date,
      value: Number(p[sel.series as keyof Pt]) || 0,
    }));
  }, [report, selected, sel.series]);

  const exportCsv = () => {
    if (!report) return;
    downloadCsv(
      `analytics-${report.range.from}-to-${report.range.to}`,
      [
        { key: 'date', header: 'Date (IST)' },
        {
          key: 'visitors',
          header: report.series.visitorsAreDailyUnique
            ? 'Visitors (sum of daily uniques)'
            : 'Unique visitors',
        },
        { key: 'views', header: 'Profile views' },
        { key: 'actions', header: 'Customer actions' },
        { key: 'claims', header: 'Offer claims' },
        { key: 'spend', header: 'Verified spend (INR)' },
      ],
      report.series.points,
    );
  };

  const noBusiness = !bizLoading && !activeBusinessId;

  return (
    <>
      <PageHeader
        title="Analytics"
        description={
          activeBusiness?.name
            ? `How customers find and act on ${activeBusiness.name}.`
            : 'How customers find and act on your business.'
        }
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

      {noBusiness ? (
        <EmptyState
          icon={Users}
          title="No business found"
          description="Analytics appear once your business profile is set up."
        />
      ) : error && !report ? (
        <EmptyState
          icon={RefreshCw}
          title="Analytics didn't load"
          description={error}
          action={{ label: 'Try again', onClick: () => setNonce((x) => x + 1) }}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {MAIN.map((m) => (
              <KpiCard
                key={m.key}
                label={m.label}
                icon={m.icon}
                format={m.format}
                definition={m.definition}
                metric={report?.kpis[m.key]}
                spark={spark(m.series)}
                loading={loading && !report}
                selected={selected === m.key}
                onSelect={() => setSelected(m.key)}
              />
            ))}
          </div>

          <SectionCard
            title={sel.label}
            description={
              report
                ? `${report.range.granularity === 'day' ? 'Daily' : report.range.granularity === 'week' ? 'Weekly' : 'Monthly'} · IST · today shown dashed while in progress`
                : undefined
            }
          >
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
              title="Customer journey"
              description="From first visit to verified purchase, this period"
            >
              {report ? <Funnel stages={report.funnel} /> : <div className="ui-skeleton h-40" />}
            </SectionCard>
            <SectionCard
              title="How customers reach you"
              description="Taps on your profile's contact buttons"
            >
              {report ? (
                <BarList
                  items={report.actionsBreakdown.map((a) => ({
                    key: a.key,
                    label: a.label,
                    value: a.value,
                  }))}
                  emptyLabel="No taps yet in this period"
                />
              ) : (
                <div className="ui-skeleton h-40" />
              )}
            </SectionCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Where visitors come from"
              description="Unique visitors by entry point"
            >
              {report ? (
                <BarList
                  items={report.sources.map((s) => ({
                    key: s.key,
                    label: SOURCE_LABEL[s.key] ?? s.key,
                    value: s.visitors,
                  }))}
                />
              ) : (
                <div className="ui-skeleton h-40" />
              )}
            </SectionCard>
            <SectionCard title="Devices" description="Unique visitors by device">
              {report ? (
                <BarList
                  items={report.devices.map((s) => ({
                    key: s.key,
                    label: DEVICE_LABEL[s.key] ?? s.key,
                    value: s.visitors,
                  }))}
                />
              ) : (
                <div className="ui-skeleton h-40" />
              )}
            </SectionCard>
          </div>

          <SectionCard
            title="When people look you up"
            description="Profile views by day and hour (IST)"
          >
            {report ? <Heatmap cells={report.heatmap} /> : <div className="ui-skeleton h-48" />}
          </SectionCard>

          <div>
            <h2 className="mb-3 text-heading">Offer performance</h2>
            <DataTable
              caption="Offer performance"
              columns={OFFER_COLUMNS}
              rows={report?.offers ?? []}
              rowKey={(o) => o.id}
              loading={loading && !report}
              defaultSort={{ key: 'claims', dir: 'desc' }}
              empty={{
                icon: TicketPercent,
                title: 'No offers yet',
                description: 'Create an offer to see how many people open and claim it.',
                action: { label: 'Create offer', href: '/dashboard/offers' },
              }}
              mobileCard={(o) => (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{o.title}</p>
                    <p className="text-caption text-muted-foreground">
                      {formatNumber(o.viewers)} opened · {formatNumber(o.claims)} claimed
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {o.conversion == null ? '—' : formatPct(o.conversion)}
                  </span>
                </div>
              )}
            />
          </div>

          <div>
            <h2 className="mb-3 text-heading">More activity</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <KpiCard
                compact
                label="Spin wheel redeemed"
                icon={Sparkles}
                metric={report?.kpis.spinRedemptions}
                loading={loading && !report}
              />
              <KpiCard
                compact
                label="Vouchers redeemed"
                icon={Gift}
                metric={report?.kpis.voucherRedemptions}
                loading={loading && !report}
              />
              <KpiCard
                compact
                label="New customers"
                icon={UserPlus}
                metric={report?.kpis.newCustomers}
                loading={loading && !report}
                definition="Customers whose first interaction with you (claim, bill, spin) happened in this period."
              />
              <KpiCard
                compact
                label="New reviews"
                icon={Star}
                metric={report?.kpis.newReviews}
                loading={loading && !report}
              />
              <KpiCard
                compact
                label="Saved to favourites"
                icon={Bookmark}
                metric={report?.kpis.saves}
                loading={loading && !report}
              />
              <KpiCard
                compact
                label="Shares"
                icon={Share2}
                metric={report?.kpis.shares}
                loading={loading && !report}
              />
              <KpiCard
                compact
                label="QR scans"
                icon={QrCode}
                metric={report?.kpis.qrScans}
                loading={loading && !report}
              />
              <KpiCard
                compact
                label="Verified bills"
                icon={BadgeIndianRupee}
                metric={report?.kpis.verifiedBills}
                loading={loading && !report}
              />
            </div>
            {report?.avgRatingInPeriod != null && (
              <p className="mt-3 text-caption text-muted-foreground">
                Average rating of reviews written in this period:{' '}
                <span className="font-semibold text-foreground">{report.avgRatingInPeriod} ★</span>
              </p>
            )}
          </div>

          {report && (
            <p className="text-caption text-subtle-foreground">
              All times in IST. Bots and link previews excluded. Visits recorded before{' '}
              {formatDateKey('2026-10-08')} have no device or source, and repeat visits from that
              period may each count as a visitor. Updated{' '}
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

export default function AnalyticsPage() {
  return (
    <BusinessLayout>
      <Suspense fallback={<div className="ui-skeleton h-96 rounded-card" />}>
        <AnalyticsInner />
      </Suspense>
    </BusinessLayout>
  );
}
