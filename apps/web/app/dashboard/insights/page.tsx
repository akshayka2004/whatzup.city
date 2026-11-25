'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { PageHeader } from '@/components/system/page-header';
import { SectionCard } from '@/components/system/section-card';
import { FilterChip, ChipRow } from '@/components/system/filter-chip';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import { cn } from '@/lib/utils';

type Insights = {
  business: { name: string };
  range: { days: number; from: string; to: string };
  overview: {
    revenue: number;
    bills: number;
    customers: number;
    avgBill: number;
    avgPerCustomer: number;
    newCustomers: number;
    returningCustomers: number;
    repeatRate: number | null;
    revenueChange: number | null;
    customersChange: number | null;
    billsChange: number | null;
  };
  daily: { day: string; revenue: number; bills: number }[];
  weekdays: { label: string; revenue: number; bills: number }[];
  spendBands: { label: string; customers: number }[];
  frequency: { label: string; customers: number }[];
  cohorts: {
    month: string;
    customers: number;
    m1: number | null;
    m2: number | null;
    m3: number | null;
  }[];
  dormancy: { slipping: number; quiet: number };
  topCustomers: { name: string; spend: number; visits: number; lastVisit: string }[];
  rewards: {
    list: {
      id: string;
      title: string;
      status: string;
      repeatable: boolean;
      targeted: boolean;
      threshold: number;
      funnel: { near: number; ready: number; claimed: number; redeemed: number; expiring: number };
      claimedToUsedRate: number | null;
      readyToClaimedRate: number | null;
      unusedOpen: number;
      unusedExpired: number;
      avgDaysToUse: number | null;
      cost: number | null;
      redeemedBillTotal: number;
      slotsLeft: number | null;
    }[];
    totals: { claimed: number; redeemed: number; cost: number; unusedOpen: number } | null;
    uplift: { people: number; before: number; after: number; change: number | null } | null;
  };
  operations: {
    pending: number;
    oldestPendingHours: number | null;
    submitted: number;
    approved: number;
    rejected: number;
    approvalRate: number | null;
    medianHoursToApprove: number | null;
    slowShare: number | null;
  };
  billMix: Record<'source' | 'channel' | 'payment', { label: string; bills: number }[]>;
  redemptions: {
    at: string;
    reward: string;
    customer: string;
    staff: string | null;
    billAmount: number | null;
  }[];
  notes: { names: string; uplift: string };
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const num = (n: number) => n.toLocaleString('en-IN');

function Change({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">no earlier period</span>;
  return (
    <span className={cn('font-medium', value >= 0 ? 'text-success' : 'text-destructive')}>
      {value >= 0 ? '+' : ''}
      {value}%
    </span>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <Card className="rounded-2xl p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

/** A row of labelled bars. The numbers are written out, so it reads without colour. */
function Bars({ rows, money }: { rows: { label: string; value: number }[]; money?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-2 text-sm">
          <span className="truncate text-muted-foreground">{r.label}</span>
          <span className="h-3 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-primary/70"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </span>
          <span className="text-right tabular-nums">{money ? inr(r.value) : num(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

function Columns({ rows }: { rows: { day: string; revenue: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.revenue));
  return (
    <div>
      <div className="flex h-32 items-end gap-0.5" role="img" aria-label="Revenue per day">
        {rows.map((r) => (
          <div
            key={r.day}
            className="flex-1 rounded-t bg-primary/70"
            style={{ height: `${Math.max(2, (r.revenue / max) * 100)}%` }}
            title={`${r.day}: ${inr(r.revenue)}`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{rows[0]?.day.slice(5)}</span>
        <span>Best day: {inr(max)}</span>
        <span>{rows[rows.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const { user } = useAuth();
  const businessId = user?.businessId || user?.entity?.id;
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    let live = true;
    setLoading(true);
    apiService
      .get<Insights>(`/v1/vouchers/insights/${businessId}?days=${days}`, { fresh: true })
      .then((res) => {
        if (!live) return;
        setLoading(false);
        if (res.error || !res.data) {
          setError(res.error || 'Could not load insights.');
          setData(null);
          return;
        }
        setError('');
        setData(res.data);
      });
    return () => {
      live = false;
    };
  }, [businessId, days]);

  return (
    <BusinessLayout>
      <PageHeader
        title="Insights"
        description="How your customers and rewards are doing. Built from verified bills only."
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/vouchers">Rewards</Link>
          </Button>
        }
      />
      <ChipRow label="Period" className="mb-4">
        {[30, 60, 90].map((d) => (
          <FilterChip key={d} selected={days === d} onClick={() => setDays(d)}>
            Last {d} days
          </FilterChip>
        ))}
      </ChipRow>

      {error ? (
        <Card className="rounded-2xl p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      ) : !data ? (
        <Loader2
          className="mx-auto my-12 size-6 animate-spin text-muted-foreground"
          aria-label="Loading"
        />
      ) : (
        <div className={cn('space-y-6', loading && 'opacity-60')} data-testid="insights">
          {data.operations.pending > 0 && (data.operations.oldestPendingHours ?? 0) > 24 && (
            <Card
              className="flex items-start gap-3 rounded-2xl border-warning/40 bg-warning-soft p-4"
              role="alert"
            >
              <AlertTriangle
                className="mt-0.5 size-5 shrink-0 text-warning-soft-foreground"
                aria-hidden
              />
              <p className="text-sm text-warning-soft-foreground">
                {data.operations.pending} bill{data.operations.pending === 1 ? ' is' : 's are'}{' '}
                waiting for you, the oldest for{' '}
                {Math.round(data.operations.oldestPendingHours ?? 0)} hours. Customers earn rewards
                only after you approve.{' '}
                <Link href="/dashboard/moderation" className="font-semibold underline">
                  Open the bill queue
                </Link>
              </p>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Revenue (verified bills)"
              value={inr(data.overview.revenue)}
              sub={
                <>
                  <Change value={data.overview.revenueChange} /> vs the period before
                </>
              }
            />
            <Stat
              label="Customers"
              value={num(data.overview.customers)}
              sub={
                <>
                  <Change value={data.overview.customersChange} /> vs the period before
                </>
              }
            />
            <Stat
              label="Average bill"
              value={inr(data.overview.avgBill)}
              sub={`${num(data.overview.bills)} bills`}
            />
            <Stat
              label="Came back"
              value={data.overview.repeatRate == null ? '—' : `${data.overview.repeatRate}%`}
              sub="Customers with 2 or more bills"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Revenue by day"
              description={`${data.range.from} to ${data.range.to}`}
            >
              <Columns rows={data.daily} />
            </SectionCard>
            <SectionCard title="Busiest days of the week" description="Revenue by weekday">
              <Bars rows={data.weekdays.map((w) => ({ label: w.label, value: w.revenue }))} money />
            </SectionCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard title="New and returning">
              <Bars
                rows={[
                  { label: 'New customers', value: data.overview.newCustomers },
                  { label: 'Returning', value: data.overview.returningCustomers },
                ]}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Average per customer: {inr(data.overview.avgPerCustomer)}
              </p>
            </SectionCard>
            <SectionCard
              title="How much customers spend"
              description="Total per customer in the period"
            >
              <Bars rows={data.spendBands.map((b) => ({ label: b.label, value: b.customers }))} />
            </SectionCard>
            <SectionCard title="How often they visit">
              <Bars rows={data.frequency.map((b) => ({ label: b.label, value: b.customers }))} />
            </SectionCard>
          </div>

          <SectionCard
            title="Are customers coming back?"
            description="Customers grouped by the month of their first bill, and the share who bought again in the next months."
          >
            {data.cohorts.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">Not enough bills yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[26rem] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-2 py-2 font-medium">First bill in</th>
                      <th className="px-2 py-2 text-right font-medium">Customers</th>
                      <th className="px-2 py-2 text-right font-medium">Next month</th>
                      <th className="px-2 py-2 text-right font-medium">2 months on</th>
                      <th className="px-2 py-2 text-right font-medium">3 months on</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cohorts.map((c) => (
                      <tr key={c.month} className="border-b border-border last:border-0">
                        <td className="px-2 py-2">{c.month}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{num(c.customers)}</td>
                        {[c.m1, c.m2, c.m3].map((v, i) => (
                          <td key={i} className="px-2 py-2 text-right tabular-nums">
                            {v == null ? '—' : `${v}%`}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {(data.dormancy.slipping > 0 || data.dormancy.quiet > 0) && (
              <p className="mt-3 text-sm text-muted-foreground">
                {num(data.dormancy.slipping)} repeat customers have not been in for 30 to 60 days,
                and {num(data.dormancy.quiet)} for over 60 days. A reward aimed at &quot;gone
                quiet&quot; customers can bring them back.
              </p>
            )}
          </SectionCard>

          <SectionCard
            title="Rewards"
            description="From close, to ready, to claimed, to used."
            action={
              data.rewards.totals ? (
                <span className="text-sm font-semibold tabular-nums">
                  {num(data.rewards.totals.redeemed)} used
                  {data.rewards.totals.cost > 0 ? ` · ${inr(data.rewards.totals.cost)} given` : ''}
                </span>
              ) : undefined
            }
          >
            {data.rewards.list.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">
                No rewards yet.{' '}
                <Link href="/dashboard/vouchers" className="font-medium underline">
                  Create one
                </Link>
              </p>
            ) : (
              <div className="space-y-4">
                {data.rewards.list.map((r) => (
                  <div key={r.id} className="space-y-2 rounded-xl border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">
                        {r.title}{' '}
                        <span className="text-xs font-normal text-muted-foreground">
                          at ₹{num(r.threshold)}
                          {r.repeatable ? ' · repeats' : ''}
                          {r.targeted ? ' · targeted' : ''}
                          {r.status !== 'ACTIVE' ? ` · ${r.status.toLowerCase()}` : ''}
                        </span>
                      </p>
                      {r.slotsLeft != null && (
                        <span className="text-xs text-muted-foreground">
                          {r.slotsLeft} slots left
                        </span>
                      )}
                    </div>
                    <Bars
                      rows={[
                        { label: 'Almost there', value: r.funnel.near },
                        { label: 'Ready to claim', value: r.funnel.ready },
                        { label: 'Claimed', value: r.funnel.claimed },
                        { label: 'Used', value: r.funnel.redeemed },
                      ]}
                    />
                    <p className="text-xs text-muted-foreground">
                      {r.readyToClaimedRate != null &&
                        `${r.readyToClaimedRate}% of those ready claimed it. `}
                      {r.claimedToUsedRate != null &&
                        `${r.claimedToUsedRate}% of claimed codes were used. `}
                      {r.avgDaysToUse != null && `Used after ${r.avgDaysToUse} days on average. `}
                      {r.unusedOpen > 0 && `${r.unusedOpen} codes waiting to be used. `}
                      {r.unusedExpired > 0 && `${r.unusedExpired} expired unused. `}
                      {r.cost != null && `Given away: ${inr(r.cost)}.`}
                    </p>
                  </div>
                ))}
                {data.rewards.uplift && data.rewards.uplift.people > 0 && (
                  <p className="text-sm">
                    Customers who used a reward spent {inr(data.rewards.uplift.before)} in the 30
                    days before and {inr(data.rewards.uplift.after)} in the 30 days after (
                    <Change value={data.rewards.uplift.change} />, {data.rewards.uplift.people}{' '}
                    people). <span className="text-muted-foreground">{data.notes.uplift}</span>
                  </p>
                )}
              </div>
            )}
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Your best customers" description={data.notes.names}>
              {data.topCustomers.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">
                  No verified bills in this period.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.topCustomers.map((c, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="min-w-0 truncate">
                        {i + 1}. {c.name}
                        <span className="block text-xs text-muted-foreground">
                          {c.visits} visit{c.visits === 1 ? '' : 's'} · last {c.lastVisit}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">{inr(c.spend)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard
              title="Bill approval"
              description="Slow approval is the main reason customers stop trying."
            >
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Waiting now</p>
                  <p className="text-xl font-bold tabular-nums">{num(data.operations.pending)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Typical time to approve</p>
                  <p className="text-xl font-bold tabular-nums">
                    {data.operations.medianHoursToApprove == null
                      ? '—'
                      : `${data.operations.medianHoursToApprove} h`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Approved</p>
                  <p className="text-xl font-bold tabular-nums">
                    {data.operations.approvalRate == null
                      ? '—'
                      : `${data.operations.approvalRate}%`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Took over a day</p>
                  <p className="text-xl font-bold tabular-nums">
                    {data.operations.slowShare == null ? '—' : `${data.operations.slowShare}%`}
                  </p>
                </div>
              </div>
              {data.billMix.source.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Where bills come from</p>
                  <Bars
                    rows={data.billMix.source.map((s) => ({
                      label: s.label === 'COUNTER' ? 'Quick pay' : 'Photo bills',
                      value: s.bills,
                    }))}
                  />
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Quick pay approves in seconds.{' '}
                <Link href="/dashboard/counter" className="font-medium underline">
                  Use the counter screen
                </Link>
              </p>
            </SectionCard>
          </div>

          <SectionCard
            title="Recent rewards used"
            description="Who served them, so you can see staff using the system properly."
          >
            {data.redemptions.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">None in this period.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.redemptions.map((r, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                  >
                    <span className="min-w-0">
                      {r.reward} · {r.customer}
                      <span className="block text-xs text-muted-foreground">
                        {new Date(r.at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                          timeZone: 'Asia/Kolkata',
                        })}
                        {r.staff ? ` · by ${r.staff}` : ''}
                      </span>
                    </span>
                    {r.billAmount != null && (
                      <span className="tabular-nums">{inr(r.billAmount)} bill</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      )}
    </BusinessLayout>
  );
}
