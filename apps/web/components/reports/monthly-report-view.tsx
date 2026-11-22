'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Loader2, Printer } from 'lucide-react';
import { PageHeader } from '@/components/system/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiService } from '@/lib/services/api-service';
import { cn } from '@/lib/utils';

type Report = {
  month: { key: string; label: string; days: number; futureStart: boolean };
  scope: 'platform' | 'mine';
  generatedAt: string;
  totals: {
    revenue: number;
    previousRevenue: number;
    revenueChange: number | null;
    bills: number;
    businesses: number;
    profileViews: number;
    saves: number;
  };
  users: {
    total: number;
    regular: number;
    activeThisMonth: number;
    byRole: Record<string, number>;
  } | null;
  newUsers: {
    total: number;
    regular: number;
    referred: number;
    previousTotal: number;
    change: number | null;
    byDay: { day: string; count: number }[];
  } | null;
  businesses: {
    id: string;
    name: string;
    category: string;
    city: string;
    views: number;
    calls: number;
    directions: number;
    whatsapp: number;
    saves: number;
    bills: number;
    revenue: number;
    reviews: number;
  }[];
  businessesShown: number;
  interest: { totalSaves: number; topSaved: { name: string; category: string; saves: number }[] };
  revenueByCategory: {
    category: string;
    revenue: number;
    bills: number;
    businesses: number;
    share: number;
    change: number | null;
  }[];
  topSpenders: {
    byBusiness: {
      business: string;
      category: string;
      name: string;
      amount: number;
      bills: number;
    }[];
    byCategory: { category: string; name: string; amount: number; bills: number }[];
  };
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const num = (n: number) => n.toLocaleString('en-IN');
const thisMonth = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 7);

function Change({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">new</span>;
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

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 break-inside-avoid" aria-label={title}>
      <div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Table({
  head,
  rows,
  empty,
}: {
  head: string[];
  rows: React.ReactNode[][];
  empty: string;
}) {
  if (!rows.length) {
    return <Card className="rounded-2xl p-4 text-sm text-muted-foreground">{empty}</Card>;
  }
  return (
    <Card className="overflow-x-auto rounded-2xl p-0">
      <table className="w-full min-w-[32rem] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            {head.map((h, i) => (
              <th
                key={h}
                scope="col"
                className={cn('px-3 py-2 font-medium', i > 1 && 'text-right')}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {r.map((c, j) => (
                <td
                  key={j}
                  className={cn('px-3 py-2 text-foreground', j > 1 && 'text-right tabular-nums')}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/**
 * The monthly report. `scope="platform"` is the admin version (everyone, any category);
 * `scope="mine"` is a business owner's own businesses only.
 */
export function MonthlyReportView({ scope }: { scope: 'platform' | 'mine' }) {
  const base = scope === 'platform' ? '/v1/monthly-reports' : '/v1/monthly-reports/mine';
  const [month, setMonth] = useState(thisMonth());
  const [categoryId, setCategoryId] = useState('');
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (scope !== 'platform') return;
    apiService.get<any>('/v1/monthly-reports/categories').then((r) => {
      if (Array.isArray(r.data)) setCats(r.data);
    });
  }, [scope]);

  const query = useCallback(() => {
    const qs = new URLSearchParams({ month });
    if (scope === 'platform' && categoryId) qs.set('categoryId', categoryId);
    return qs.toString();
  }, [month, categoryId, scope]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    apiService.get<Report>(`${base}?${query()}`, { fresh: true }).then((res) => {
      if (!live) return;
      setLoading(false);
      if (res.error || !res.data) {
        setError(res.error || 'Could not load the report.');
        setData(null);
        return;
      }
      setError('');
      setData(res.data);
    });
    return () => {
      live = false;
    };
  }, [base, query]);

  const csvHref = `/api${base}/csv?${query()}`;
  const ready = data && !loading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly report"
        description={
          scope === 'platform'
            ? 'Users, businesses, sign-ups, wishlists, revenue and the biggest spenders for one month. Revenue counts verified bills only.'
            : 'How your businesses did this month: views, saves, verified bills and your biggest customers.'
        }
      />

      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <label className="space-y-1">
          <span className="block text-xs font-medium text-muted-foreground">Month</span>
          <input
            type="month"
            value={month}
            max={thisMonth()}
            min="2024-01"
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            aria-label="Report month"
          />
        </label>
        {scope === 'platform' && (
          <label className="space-y-1">
            <span className="block text-xs font-medium text-muted-foreground">Category</span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
              aria-label="Category"
            >
              <option value="">All categories</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button asChild variant="outline" className="min-h-11 gap-1.5">
            <a href={csvHref} download>
              <Download className="size-4" aria-hidden /> CSV
            </a>
          </Button>
          <Button
            variant="outline"
            className="min-h-11 gap-1.5"
            onClick={() => window.print()}
            disabled={!ready}
          >
            <Printer className="size-4" aria-hidden /> Print / PDF
          </Button>
        </div>
      </div>

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
        <div className={cn('space-y-8', loading && 'opacity-60')} data-testid="monthly-report">
          <div>
            <h2 className="text-xl font-bold text-foreground">{data.month.label}</h2>
            {data.month.futureStart && (
              <p className="text-sm text-muted-foreground">This month has not started yet.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Revenue (verified bills)"
              value={inr(data.totals.revenue)}
              sub={
                <>
                  <Change value={data.totals.revenueChange} /> vs last month
                </>
              }
            />
            <Stat label="Verified bills" value={num(data.totals.bills)} />
            <Stat label="Profile views" value={num(data.totals.profileViews)} />
            <Stat label="Saved by customers" value={num(data.totals.saves)} />
          </div>

          {data.users && data.newUsers && (
            <>
              <Section title="Users" hint="Everyone on the platform right now.">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Stat label="All accounts" value={num(data.users.total)} />
                  <Stat label="Regular users" value={num(data.users.regular)} />
                  <Stat label="Signed in this month" value={num(data.users.activeThisMonth)} />
                  <Stat
                    label="Business accounts"
                    value={num(
                      (data.users.byRole.BUSINESS_OWNER ?? 0) +
                        (data.users.byRole.BUSINESS_MODERATOR ?? 0) +
                        (data.users.byRole.BUSINESS_STAFF ?? 0),
                    )}
                  />
                </div>
              </Section>

              <Section title="New users from the portal" hint="Accounts created this month.">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Stat
                    label="Joined"
                    value={num(data.newUsers.total)}
                    sub={
                      <>
                        <Change value={data.newUsers.change} /> vs last month (
                        {data.newUsers.previousTotal})
                      </>
                    }
                  />
                  <Stat label="Regular users" value={num(data.newUsers.regular)} />
                  <Stat label="Came by referral" value={num(data.newUsers.referred)} />
                </div>
                <DailyBars days={data.newUsers.byDay} />
              </Section>
            </>
          )}

          <Section
            title="Hotel and business analytics"
            hint={
              data.businesses.length < data.totals.businesses
                ? `Top ${data.businesses.length} of ${data.totals.businesses} by revenue. The CSV has the same list.`
                : 'Sorted by revenue.'
            }
          >
            <Table
              head={[
                'Business',
                'City',
                'Views',
                'Calls',
                'Directions',
                'Saves',
                'Bills',
                'Revenue',
              ]}
              rows={data.businesses.map((b) => [
                <span key="n">
                  {b.name}
                  <span className="block text-xs text-muted-foreground">{b.category}</span>
                </span>,
                b.city,
                num(b.views),
                num(b.calls),
                num(b.directions),
                num(b.saves),
                num(b.bills),
                inr(b.revenue),
              ])}
              empty="No businesses to report on for this month."
            />
          </Section>

          <Section title="Wishlists and interest" hint="Businesses customers saved this month.">
            <Table
              head={['Business', 'Category', 'Saved by']}
              rows={data.interest.topSaved.map((b) => [b.name, b.category, num(b.saves)])}
              empty="Nobody saved a business this month."
            />
          </Section>

          <Section title="Revenue by category" hint="Verified bills, by the date on the bill.">
            <Table
              head={['Category', 'Businesses', 'Bills', 'Share', 'Change', 'Revenue']}
              rows={data.revenueByCategory.map((c) => [
                c.category,
                num(c.businesses),
                num(c.bills),
                `${c.share}%`,
                <Change key="c" value={c.change} />,
                inr(c.revenue),
              ])}
              empty="No verified bills in this month."
            />
          </Section>

          <Section title="Highest spender in each business">
            <Table
              head={['Business', 'Category', 'Spender', 'Bills', 'Spent']}
              rows={data.topSpenders.byBusiness.map((s) => [
                s.business,
                s.category,
                s.name,
                num(s.bills),
                inr(s.amount),
              ])}
              empty="No verified bills in this month."
            />
          </Section>

          <Section title="Highest spender in each category">
            <Table
              head={['Category', 'Spender', 'Bills', 'Spent']}
              rows={data.topSpenders.byCategory.map((s) => [
                s.category,
                s.name,
                num(s.bills),
                inr(s.amount),
              ])}
              empty="No verified bills in this month."
            />
          </Section>

          <p className="text-xs text-muted-foreground">
            Made {new Date(data.generatedAt).toLocaleString('en-IN')}. Times are India time.
          </p>
        </div>
      )}
    </div>
  );
}

/** One bar per day. The numbers are in the labels, so it reads without colour. */
function DailyBars({ days }: { days: { day: string; count: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <Card className="rounded-2xl p-4">
      <div className="flex h-28 items-end gap-0.5" role="img" aria-label="New users per day">
        {days.map((d) => (
          <div
            key={d.day}
            className="flex-1 rounded-t bg-primary/70"
            style={{ height: `${Math.max(2, (d.count / max) * 100)}%` }}
            title={`${d.day}: ${d.count}`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{days[0]?.day.slice(8)}</span>
        <span>Busiest day: {max}</span>
        <span>{days[days.length - 1]?.day.slice(8)}</span>
      </div>
    </Card>
  );
}
