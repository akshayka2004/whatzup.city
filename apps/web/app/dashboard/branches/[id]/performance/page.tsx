'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Users, Receipt, Tag, Star, TrendingUp,
  Building2, BarChart3, Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { apiService } from '@/lib/services/api-service';

const RANGES = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
] as const;

type Range = (typeof RANGES)[number]['label'];

const tooltipStyle = {
  background: '#121212',
  borderColor: 'oklch(0.25 0 0)',
  borderRadius: '12px',
  fontSize: '11px',
};

interface EventCount { event: string; _count: number }

export default function BranchPerformancePage() {
  const params = useParams();
  const branchId = params?.id as string;

  const [range, setRange] = useState<Range>('30D');
  const [branchName, setBranchName] = useState('Branch');
  const [events, setEvents] = useState<EventCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!branchId) return;
      setLoading(true);
      const days = RANGES.find((r) => r.label === range)?.days ?? 30;
      const res = await apiService.get<any>(`/v1/branches/${branchId}/performance?days=${days}`);
      if (res.data && !res.error) {
        setBranchName(res.data.branch?.name || 'Branch');
        const evs: any[] = res.data.events || [];
        setEvents(
          evs.map((e: any) => ({
            event: e.event,
            _count: typeof e._count === 'number' ? e._count : e._count?._all ?? 0,
          })),
        );
      }
      setLoading(false);
    }
    load();
  }, [branchId, range]);

  const getCount = (name: string) => events.find((e) => e.event === name)?._count || 0;

  const visits = getCount('BUSINESS_VIEW') + getCount('PROFILE_VIEW');
  const purchases = getCount('BILL_VERIFIED') + getCount('PURCHASE');
  const claims = getCount('OFFER_CLAIMED') + getCount('OFFER_CLAIM') + getCount('OFFER_REDEEM');
  const reviews = getCount('REVIEW_SUBMIT');

  const kpis = [
    { label: 'Total Visits', value: visits.toLocaleString(), icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Verified Purchases', value: purchases.toLocaleString(), icon: Receipt, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Offer Redemptions', value: claims.toLocaleString(), icon: Tag, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Reviews', value: reviews.toLocaleString(), icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  ];

  const chartData = events
    .filter((e) => e._count > 0)
    .slice(0, 10)
    .map((e) => ({
      event: e.event.replace(/_/g, ' ').toLowerCase(),
      count: e._count,
    }));

  return (
    <BusinessLayout>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Link href="/dashboard/branches">
              <Button variant="outline" size="sm" className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 mt-1 cursor-pointer">
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Branch Performance</span>
              </div>
              <h1 className="text-3xl font-extrabold text-foreground tracking-tight">{branchName}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Live analytics for this location.</p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 mt-1">
            {RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => setRange(r.label)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  range === r.label
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <Card key={kpi.label} className="p-5 rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2.5 rounded-xl ${kpi.bg}`}>
                        <Icon className={`h-4 w-4 ${kpi.color}`} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-0.5">{kpi.label}</p>
                    <p className="text-2xl font-extrabold text-foreground">{kpi.value}</p>
                  </Card>
                );
              })}
            </div>

            <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-foreground">Event Activity</h3>
                  <p className="text-xs text-muted-foreground">Aggregated event counts for selected window</p>
                </div>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="h-64">
                {chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No activity in this window
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.22 0 0)" />
                      <XAxis dataKey="event" stroke="oklch(0.55 0 0)" fontSize={10} tickLine={false} />
                      <YAxis stroke="oklch(0.55 0 0)" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#fff', fontWeight: 'bold' }} />
                      <Bar dataKey="count" fill="oklch(0.65 0.15 280)" radius={[3, 3, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card className="p-5 rounded-2xl border-amber-500/10 bg-amber-500/5">
              <p className="text-xs text-amber-300 flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" />
                Analytics events are scoped to the parent business in the current schema. Per-branch
                attribution will arrive in a future release.
              </p>
            </Card>
          </>
        )}
      </div>
    </BusinessLayout>
  );
}
