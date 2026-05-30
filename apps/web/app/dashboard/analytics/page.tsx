'use client';

import { useState, useEffect, useCallback } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, Users, Tag, Star, Eye,
  ShoppingBag, RefreshCw, Loader2, UserCheck, Heart,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false });
import { analyticsService } from '@/lib/services/analytics-service';
import { useAuth } from '@/hooks/use-auth';

const RANGES = ['7D', '30D', '90D'] as const;
type Range = (typeof RANGES)[number];

const tooltipStyle = {
  background: '#0f0f0f',
  borderColor: 'oklch(0.22 0 0)',
  borderRadius: '10px',
  fontSize: '11px',
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  bg,
  loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  color: string;
  bg: string;
  loading: boolean;
}) {
  return (
    <Card className="p-4 md:p-5 rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl hover:shadow-lg transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-28 h-28 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
      <div className={`inline-flex p-2 md:p-2.5 rounded-xl mb-2 md:mb-3 ${bg}`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5 truncate">{label}</p>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" />
      ) : (
        <>
          <p className="text-lg md:text-2xl font-extrabold text-foreground leading-tight">{value}</p>
          {sub && <p className="text-[9px] md:text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
        </>
      )}
    </Card>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<Range>('30D');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);

  const businessId = user?.businessId || user?.entity?.id;

  const rangeToDays: Record<Range, number> = { '7D': 7, '30D': 30, '90D': 90 };

  const fetchSummary = useCallback(async () => {
    if (!businessId) { setLoading(false); return; }
    setLoading(true);
    setError(false);
    try {
      const result = await analyticsService.getBusinessSummary(businessId, rangeToDays[range]);
      if (result) {
        setData(result);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [businessId, range]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const kpis = data?.kpis ?? {};
  const offerPerfRaw   = data?.offerPerformance ?? [];
  const offerPerf = offerPerfRaw.map((o: any) => ({
    ...o,
    title: (o.title as string || '').length > 10
      ? (o.title as string).slice(0, 10) + '…'
      : (o.title as string || ''),
  }));
  const redemTrend  = data?.redemptionTrend ?? [];
  const ratingDist  = data?.ratingDistribution ?? [];
  const recentRevs  = data?.recentReviews ?? [];

  const avgRatingDisplay = kpis.avgRating != null
    ? Number(kpis.avgRating).toFixed(1)
    : '—';

  const statCards = [
    {
      label: 'Listing Impressions',
      value: loading ? '…' : (kpis.impressions ?? 0).toLocaleString(),
      sub: `past ${rangeToDays[range]} days`,
      icon: Eye,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
    },
    {
      label: 'Active Offers',
      value: loading ? '…' : `${kpis.activeOffers ?? 0} / ${kpis.totalOffers ?? 0}`,
      sub: 'active / total',
      icon: Tag,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Total Redemptions',
      value: loading ? '…' : (kpis.totalRedemptions ?? 0).toLocaleString(),
      sub: 'all-time across all offers',
      icon: ShoppingBag,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Avg Rating',
      value: loading ? '…' : avgRatingDisplay,
      sub: kpis.totalReviews
        ? `${kpis.totalReviews} review${kpis.totalReviews !== 1 ? 's' : ''}`
        : 'no reviews yet',
      icon: Star,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      label: 'Total Reviews',
      value: loading ? '…' : (kpis.totalReviews ?? 0).toLocaleString(),
      sub: avgRatingDisplay !== '—' ? `${avgRatingDisplay} avg` : undefined,
      icon: Users,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
    },
    {
      label: 'Team Members',
      value: loading ? '…' : (kpis.teamCount ?? 0).toLocaleString(),
      sub: 'active staff',
      icon: UserCheck,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
    },
    {
      label: 'Customers',
      value: loading ? '…' : (kpis.customerCount ?? 0).toLocaleString(),
      sub: 'unique customers tracked',
      icon: Heart,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
    },
    {
      label: 'Total Claims',
      value: loading ? '…' : (kpis.totalClaims ?? 0).toLocaleString(),
      sub: 'offer claims via CRM',
      icon: Tag,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
    },
    {
      label: 'Redemption Rate',
      value: loading ? '…' : `${kpis.redemptionRate ?? 0}%`,
      sub: 'claims → redemptions',
      icon: TrendingUp,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10',
    },
  ];

  return (
    <BusinessLayout>
      <div className="space-y-8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Real-time business performance from your database.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    range === r
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSummary}
              disabled={loading}
              className="rounded-xl border-white/10 gap-1.5 text-slate-300 hover:bg-white/5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* ── No business ── */}
        {!businessId && (
          <Card className="p-12 rounded-2xl border-white/5 bg-card/40 text-center">
            <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-foreground font-semibold mb-1">No business linked</p>
            <p className="text-sm text-muted-foreground">Your account is not linked to a business.</p>
          </Card>
        )}

        {/* ── Error ── */}
        {!loading && error && businessId && (
          <Card className="p-12 rounded-2xl border-rose-500/20 bg-rose-500/5 text-center">
            <TrendingUp className="h-10 w-10 mx-auto text-rose-400 mb-3 opacity-60" />
            <p className="text-foreground font-semibold mb-1">Failed to load analytics</p>
            <p className="text-sm text-muted-foreground mb-4">Could not fetch analytics data. Try refreshing.</p>
            <Button onClick={fetchSummary} size="sm" className="rounded-xl bg-primary text-primary-foreground">
              Retry
            </Button>
          </Card>
        )}

        {businessId && !error && (
          <>
            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              {statCards.map((card, i) => (
                <StatCard key={i} {...card} loading={loading} />
              ))}
            </div>

            {/* ── Redemption Trend Chart ── */}
            <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl">
              <div className="mb-5">
                <h3 className="text-base font-bold text-foreground">Redemption Activity</h3>
                <p className="text-xs text-muted-foreground">
                  Daily redemptions in the last {rangeToDays[range]} days.
                </p>
              </div>
              <div className="h-56">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : redemTrend.every((d: any) => d.count === 0) ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    No redemptions recorded in this period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={redemTrend} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.22 0 0)" />
                      <XAxis
                        dataKey="date"
                        stroke="oklch(0.60 0 0)"
                        fontSize={9}
                        tickLine={false}
                        interval={Math.floor(redemTrend.length / 8)}
                      />
                      <YAxis stroke="oklch(0.60 0 0)" fontSize={10} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#fff', fontWeight: 'bold' }} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Redemptions"
                        stroke="oklch(0.630 0.045 15)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            {/* ── Offer Performance + Rating Distribution ── */}
            <div className="grid lg:grid-cols-2 gap-6">

              {/* Offer Performance */}
              <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl">
                <div className="mb-5">
                  <h3 className="text-base font-bold text-foreground">Offer Performance</h3>
                  <p className="text-xs text-muted-foreground">Claims and discount % per offer.</p>
                </div>
                <div className="h-56">
                  {loading ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : offerPerf.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                      No offers yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={offerPerf}
                        margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="oklch(0.22 0 0)" />
                        <XAxis type="number" stroke="oklch(0.60 0 0)" fontSize={10} tickLine={false} />
                        <YAxis
                          type="category"
                          dataKey="title"
                          stroke="oklch(0.60 0 0)"
                          fontSize={9}
                          tickLine={false}
                          width={75}
                        />
                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#fff', fontWeight: 'bold' }} />
                        <Legend wrapperStyle={{ fontSize: 10, color: 'oklch(0.65 0 0)' }} />
                        <Bar dataKey="redemptions" name="Claims" fill="oklch(0.630 0.045 15)" radius={[0, 4, 4, 0]} maxBarSize={18} />
                        <Bar dataKey="discount" name="Discount %" fill="oklch(0.55 0.12 270)" radius={[0, 4, 4, 0]} maxBarSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>

              {/* Rating Distribution */}
              <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl">
                <div className="mb-5">
                  <h3 className="text-base font-bold text-foreground">Rating Distribution</h3>
                  <p className="text-xs text-muted-foreground">Approved reviews by star rating.</p>
                </div>
                {loading ? (
                  <div className="h-56 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : ratingDist.every((r: any) => r.count === 0) ? (
                  <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                    No approved reviews yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ratingDist.map((r: any) => {
                      const total = ratingDist.reduce((s: number, x: any) => s + x.count, 0);
                      const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
                      return (
                        <div key={r.stars} className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-muted-foreground w-8 shrink-0">
                            {r.stars}★
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-amber-400 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right shrink-0">
                            {r.count} ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* ── Recent Reviews ── */}
            {!loading && recentRevs.length > 0 && (
              <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl">
                <h3 className="text-base font-bold text-foreground mb-4">Recent Reviews</h3>
                <div className="space-y-4">
                  {recentRevs.map((rev: any, i: number) => (
                    <div
                      key={i}
                      className="flex gap-4 p-4 rounded-xl bg-white/3 border border-white/5"
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
                        {rev.author?.charAt(0)?.toUpperCase() ?? 'C'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-foreground">{rev.author}</span>
                          <span className="text-amber-400 text-xs">{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(rev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        {rev.title && (
                          <p className="text-xs font-medium text-foreground mb-0.5">{rev.title}</p>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-2">{rev.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ── Impressions note ── */}
            <Card className="p-4 rounded-2xl border-white/5 bg-card/20 text-center">
              <p className="text-xs text-muted-foreground">
                <Eye className="inline h-3.5 w-3.5 mr-1 opacity-60" />
                Impressions are counted each time a customer opens your business listing. Counts are tracked
                from the point of deployment — historical visits before tracking was enabled show as 0.
              </p>
            </Card>
          </>
        )}

      </div>
    </BusinessLayout>
  );
}
